'use client';

import { useState, useEffect } from 'react';
import { formatRelativeTime, formatTimeWithRelative } from '@/lib/utils/time';
import { CommentForm } from './CommentForm';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    author_name: string;
    author_email?: string;
    is_anonymous?: boolean;
    created_at: string;
    upvotes: number;
    downvotes: number;
    replies?: CommentItemProps['comment'][];
  };
  postId: string;
  userEmail?: string | null;
  depth?: number;
}

export function CommentItem({ comment, postId, userEmail, depth = 0 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [currentVote, setCurrentVote] = useState<'upvote' | 'downvote' | null>(null);
  const [upvotes, setUpvotes] = useState(comment.upvotes || 0);
  const [downvotes, setDownvotes] = useState(comment.downvotes || 0);
  const [loading, setLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);

  const timeInfo = formatTimeWithRelative(comment.created_at);
  const maxDepth = 3; // Maximum nesting depth

  // Fetch current vote status on mount
  useEffect(() => {
    const fetchVoteStatus = async () => {
      try {
        const url = userEmail
          ? `/api/comments/${comment.id}/vote?email=${encodeURIComponent(userEmail)}`
          : `/api/comments/${comment.id}/vote`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.voteType) {
          setCurrentVote(data.voteType);
        }
      } catch (error) {
        // Ignore errors - user might not have voted yet
      }
    };

    fetchVoteStatus();
  }, [comment.id, userEmail]);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (voteLoading) return;

    setVoteLoading(true);
    try {
      const response = await fetch(`/api/comments/${comment.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voteType,
          email: userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al votar');
      }

      const data = await response.json();

      // Update vote state
      if (data.action === 'removed') {
        // Vote was removed
        if (currentVote === 'upvote') {
          setUpvotes((prev) => Math.max(0, prev - 1));
        } else if (currentVote === 'downvote') {
          setDownvotes((prev) => Math.max(0, prev - 1));
        }
        setCurrentVote(null);
      } else if (data.action === 'updated') {
        // Vote type changed
        if (currentVote === 'upvote') {
          setUpvotes((prev) => Math.max(0, prev - 1));
          setDownvotes((prev) => prev + 1);
        } else if (currentVote === 'downvote') {
          setDownvotes((prev) => Math.max(0, prev - 1));
          setUpvotes((prev) => prev + 1);
        }
        setCurrentVote(voteType);
      } else if (data.action === 'created') {
        // New vote
        if (voteType === 'upvote') {
          setUpvotes((prev) => prev + 1);
        } else {
          setDownvotes((prev) => prev + 1);
        }
        setCurrentVote(voteType);
      }

      // Refresh to get updated counts from server
      window.location.reload();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoteLoading(false);
    }
  };

  const netScore = upvotes - downvotes;

  return (
    <div className={`${depth > 0 ? 'ml-6 mt-4' : ''}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-semibold text-gray-900">
              {comment.is_anonymous ? 'Anónimo' : comment.author_name}
            </span>
            <span className="text-xs text-gray-500" title={timeInfo.absolute}>
              {timeInfo.relative}
            </span>
            {comment.is_anonymous && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                Anónimo
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {comment.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          {/* Voting */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                currentVote === 'upvote' ? 'text-blue-600' : 'text-gray-500'
              }`}
              onClick={() => handleVote('upvote')}
              disabled={voteLoading}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span
              className={`text-sm font-medium min-w-[2rem] text-center ${
                netScore > 0
                  ? 'text-green-600'
                  : netScore < 0
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {netScore > 0 ? '+' : ''}
              {netScore}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                currentVote === 'downvote' ? 'text-red-600' : 'text-gray-500'
              }`}
              onClick={() => handleVote('downvote')}
              disabled={voteLoading}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Reply button */}
          {depth < maxDepth && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-gray-600 hover:text-gray-900"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Responder
            </Button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && depth < maxDepth && (
          <div className="mt-4">
            <CommentForm postId={postId} parentId={comment.id} />
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                userEmail={userEmail}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

