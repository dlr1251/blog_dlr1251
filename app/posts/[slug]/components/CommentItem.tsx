'use client';

import { useState, useEffect } from 'react';
import { formatRelativeTime, formatTimeWithRelative } from '@/lib/utils/time';
import { CommentForm } from './CommentForm';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';

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
  const [voteLoading, setVoteLoading] = useState(false);

  const timeInfo = formatTimeWithRelative(comment.created_at);
  const maxDepth = 3;

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
        // Ignore errors
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

      if (data.action === 'removed') {
        if (currentVote === 'upvote') {
          setUpvotes((prev) => Math.max(0, prev - 1));
        } else if (currentVote === 'downvote') {
          setDownvotes((prev) => Math.max(0, prev - 1));
        }
        setCurrentVote(null);
      } else if (data.action === 'updated') {
        if (currentVote === 'upvote') {
          setUpvotes((prev) => Math.max(0, prev - 1));
          setDownvotes((prev) => prev + 1);
        } else if (currentVote === 'downvote') {
          setDownvotes((prev) => Math.max(0, prev - 1));
          setUpvotes((prev) => prev + 1);
        }
        setCurrentVote(voteType);
      } else if (data.action === 'created') {
        if (voteType === 'upvote') {
          setUpvotes((prev) => prev + 1);
        } else {
          setDownvotes((prev) => prev + 1);
        }
        setCurrentVote(voteType);
      }

      window.location.reload();
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoteLoading(false);
    }
  };

  const netScore = upvotes - downvotes;

  return (
    <div className={depth > 0 ? 'ml-3 sm:ml-6 mt-3' : ''}>
      <div className="border-b border-gray-100 pb-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-900">
            {comment.is_anonymous ? 'Anónimo' : comment.author_name}
          </span>
          <span className="text-xs text-gray-400" title={timeInfo.absolute}>
            {timeInfo.relative}
          </span>
        </div>

        {/* Content */}
        <div className="mb-2">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {comment.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote('upvote')}
              disabled={voteLoading}
              className={`p-1 rounded transition-colors ${
                currentVote === 'upvote'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Votar positivo"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <span
              className={`text-xs font-medium min-w-[1.5rem] text-center ${
                netScore > 0
                  ? 'text-blue-600'
                  : netScore < 0
                  ? 'text-gray-500'
                  : 'text-gray-400'
              }`}
            >
              {netScore > 0 ? '+' : ''}
              {netScore}
            </span>
            <button
              onClick={() => handleVote('downvote')}
              disabled={voteLoading}
              className={`p-1 rounded transition-colors ${
                currentVote === 'downvote'
                  ? 'text-gray-600 bg-gray-100'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Votar negativo"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {depth < maxDepth && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Responder
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && depth < maxDepth && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <CommentForm postId={postId} parentId={comment.id} />
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
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
