-- Migration: Add voting system and spam protection for comments

-- Table for comment votes
CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voter_ip TEXT,
  voter_email TEXT,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Add spam protection fields to comments table
ALTER TABLE comments 
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

-- Add vote counts to comments (denormalized for performance)
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- Table for tracking comment submissions (for rate limiting)
CREATE TABLE IF NOT EXISTS comment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address TEXT NOT NULL,
  email TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  content_hash TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user ON comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_ip_email ON comment_votes(voter_ip, voter_email);
CREATE INDEX IF NOT EXISTS idx_comments_vote_counts ON comments(upvotes DESC, downvotes DESC);
CREATE INDEX IF NOT EXISTS idx_comment_submissions_ip ON comment_submissions(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_comment_submissions_email ON comment_submissions(email, created_at);
CREATE INDEX IF NOT EXISTS idx_comment_submissions_post ON comment_submissions(post_id, created_at);

-- Unique index for anonymous votes (using expression to handle NULL emails)
-- This ensures one vote per comment per IP/email combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_votes_anonymous_unique 
  ON comment_votes(comment_id, voter_ip, COALESCE(voter_email, ''));

-- Function to update vote counts when a vote is added/updated/deleted
CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Decrease the count based on the deleted vote
    IF OLD.vote_type = 'upvote' THEN
      UPDATE comments SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.comment_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE comments SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Decrease old vote type, increase new vote type
    IF OLD.vote_type = 'upvote' THEN
      UPDATE comments SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.comment_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE comments SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.comment_id;
    END IF;
    
    IF NEW.vote_type = 'upvote' THEN
      UPDATE comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    -- Increase the count for the new vote
    IF NEW.vote_type = 'upvote' THEN
      UPDATE comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote counts
DROP TRIGGER IF EXISTS trigger_update_comment_vote_counts ON comment_votes;
CREATE TRIGGER trigger_update_comment_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION update_comment_vote_counts();

-- Function to clean up old comment submissions (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_comment_submissions()
RETURNS void AS $$
BEGIN
  DELETE FROM comment_submissions WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- RLS policies for comment_votes
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view votes on approved comments
CREATE POLICY "Anyone can view votes on approved comments" ON comment_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comments 
      WHERE comments.id = comment_votes.comment_id 
      AND comments.approved = true
    )
  );

-- Anyone can insert votes (we'll validate in the API)
CREATE POLICY "Anyone can insert votes" ON comment_votes
  FOR INSERT WITH CHECK (true);

-- Users can update their own votes
CREATE POLICY "Users can update own votes" ON comment_votes
  FOR UPDATE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (voter_ip IS NOT NULL AND voter_email IS NOT NULL)
  );

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes" ON comment_votes
  FOR DELETE USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (voter_ip IS NOT NULL AND voter_email IS NOT NULL)
  );

-- RLS for comment_submissions (admin only)
ALTER TABLE comment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access comment submissions" ON comment_submissions
  FOR ALL USING (false);

