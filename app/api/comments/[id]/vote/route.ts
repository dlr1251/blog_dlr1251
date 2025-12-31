import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getCurrentUserFromRequest } from '@/lib/api-helpers';
import crypto from 'crypto';

// POST - Vote on a comment (upvote or downvote)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { voteType } = body; // 'upvote' or 'downvote'

    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "upvote" or "downvote"' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const user = await getCurrentUserFromRequest();

    // Get comment to verify it exists and is approved
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, approved')
      .eq('id', params.id)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (!comment.approved) {
      return NextResponse.json(
        { error: 'Cannot vote on unapproved comments' },
        { status: 403 }
      );
    }

    // Get IP address and email for anonymous voting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 'unknown';
    
    // Try to get email from request body (for anonymous users)
    const voterEmail = body.email || null;

    // Check if user already voted
    let existingVote;
    if (user?.id) {
      const { data } = await supabase
        .from('comment_votes')
        .select('*')
        .eq('comment_id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      existingVote = data;
    } else if (voterEmail) {
      // For anonymous users, check by IP and email
      const { data } = await supabase
        .from('comment_votes')
        .select('*')
        .eq('comment_id', params.id)
        .eq('voter_ip', ip)
        .eq('voter_email', voterEmail)
        .maybeSingle();
      existingVote = data;
    } else {
      // For completely anonymous users (no email), check by IP only
      const { data } = await supabase
        .from('comment_votes')
        .select('*')
        .eq('comment_id', params.id)
        .eq('voter_ip', ip)
        .is('voter_email', null)
        .maybeSingle();
      existingVote = data;
    }

    if (existingVote) {
      // User already voted, update the vote
      if (existingVote.vote_type === voteType) {
        // Same vote type, remove the vote (toggle off)
        const { error: deleteError } = await supabase
          .from('comment_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ 
          success: true, 
          action: 'removed',
          voteType: null 
        });
      } else {
        // Different vote type, update it
        const { error: updateError } = await supabase
          .from('comment_votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        if (updateError) throw updateError;

        return NextResponse.json({ 
          success: true, 
          action: 'updated',
          voteType 
        });
      }
    } else {
      // New vote
      const { data: newVote, error: insertError } = await supabase
        .from('comment_votes')
        .insert({
          comment_id: params.id,
          user_id: user?.id || null,
          voter_ip: user?.id ? null : ip,
          voter_email: user?.id ? null : voterEmail,
          vote_type: voteType,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      return NextResponse.json({ 
        success: true, 
        action: 'created',
        voteType 
      });
    }
  } catch (error: any) {
    console.error('Error voting on comment:', error);
    return NextResponse.json(
      { error: 'Failed to vote on comment' },
      { status: 500 }
    );
  }
}

// GET - Get vote status for current user/visitor
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceRoleClient();
    const user = await getCurrentUserFromRequest();

    // Get IP and email from query params for anonymous users
    const { searchParams } = new URL(request.url);
    const voterEmail = searchParams.get('email');

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 'unknown';

    let vote;
    if (user?.id) {
      const { data } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      vote = data;
    } else if (voterEmail) {
      const { data } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', params.id)
        .eq('voter_ip', ip)
        .eq('voter_email', voterEmail)
        .maybeSingle();
      vote = data;
    } else {
      // For completely anonymous users, check by IP only
      const { data } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('comment_id', params.id)
        .eq('voter_ip', ip)
        .is('voter_email', null)
        .maybeSingle();
      vote = data;
    }

    return NextResponse.json({ 
      voteType: vote?.vote_type || null 
    });
  } catch (error: any) {
    console.error('Error getting vote status:', error);
    return NextResponse.json(
      { error: 'Failed to get vote status' },
      { status: 500 }
    );
  }
}

