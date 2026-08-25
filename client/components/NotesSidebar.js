'use client';
import { addNote } from '@/lib/api';
import { useState } from 'react';
import { FileText, Plus } from 'lucide-react';

function formatDate(ts) {
  return new Date(ts).toLocaleString('oth ten-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function NotesSidebar({ requestId, notes: initialNotes }) {
  const [notes, setNotes] = useState(initialNotes || []);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAddNote(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await addNote(requestId, content.trim());
      setNotes((prev) => [...prev, res.data]);
      setContent('');
    } catch (err) {
      setError(err.message || 'Failed to add note.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Internal Notes</h3>
        <FileText className="w-4 h-4 text-gray-400" />
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {notes.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No notes yet.</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">{formatDate(note.created_at)} · System</p>
            <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
          </div>
        ))}
      </div>

      {/* Add note form */}
      <form onSubmit={handleAddNote} className="flex flex-col gap-2 pt-1 border-t border-gray-100">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a new note..."
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {submitting ? 'Adding...' : 'Add Note'}
        </button>
      </form>
    </div>
  );
}
