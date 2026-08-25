'use client';
import { addNote } from '@/lib/api';
import { useState, useEffect } from 'react';
import { FileText, Plus, Check } from 'lucide-react';

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export default function NotesSidebar({ requestId, notes: initialNotes }) {
  const [notes, setNotes] = useState(initialNotes || []);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [justAdded, setJustAdded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  async function handleAddNote(e) {
    e.preventDefault();
    const noteText = content.trim();
    if (!noteText || submitting) return;

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticNote = {
      id: tempId,
      request_id: requestId,
      content: noteText,
      created_at: new Date().toISOString(),
    };

    setNotes((prev) => [...prev, optimisticNote]);
    setContent('');
    setSubmitting(true);
    setError('');

    try {
      const res = await addNote(requestId, noteText);
      setNotes((prev) => prev.map((n) => (n.id === tempId ? res.data : n)));
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (err) {
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setError(err?.message || 'Failed to add note.');
      setContent(noteText);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Internal Notes</h3>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-bold">
            {notes.length}
          </span>
        </div>
        <FileText className="w-4 h-4 text-gray-400" />
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
        {notes.length === 0 ? (
          <div className="text-center py-6 px-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 font-medium">No notes written yet.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium mb-1.5" suppressHydrationWarning>
                <span>{mounted ? formatDate(note.created_at) : ''}</span>
                <span className="bg-gray-200/70 text-gray-600 px-1.5 py-0.2 rounded font-mono text-[10px]">Desk Note</span>
              </div>
              <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-normal">{note.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Add note form */}
      <form onSubmit={handleAddNote} className="flex flex-col gap-2.5 pt-2 border-t border-gray-100">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a new internal note..."
          rows={3}
          className="w-full text-xs text-gray-900 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400 transition-all font-sans"
        />
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] shadow-2xs cursor-pointer"
        >
          {justAdded ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-700">Note Saved</span>
            </>
          ) : submitting ? (
            <span>Saving Note...</span>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Note</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
