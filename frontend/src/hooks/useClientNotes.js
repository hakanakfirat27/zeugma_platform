// frontend/src/hooks/useClientNotes.js
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Custom hook for managing client notes
 * @param {string} reportId - The report UUID
 */
const useClientNotes = (reportId) => {
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState({ total: 0, report_notes: 0, company_notes: 0 });
  const [recordNotesMap, setRecordNotesMap] = useState({}); // {record_id: count}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all notes for the report
  const fetchNotes = useCallback(async () => {
    if (!reportId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/client/notes/?report_id=${reportId}`);
      setNotes(response.data.results || []);
      setStats(response.data.stats || { total: 0, report_notes: 0, company_notes: 0 });
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  // Fetch notes stats (for showing badges on company rows)
  const fetchNotesStats = useCallback(async () => {
    if (!reportId) return;
    
    try {
      const response = await api.get(`/api/client/notes/stats/?report_id=${reportId}`);
      setStats({
        total: response.data.total_notes || 0,
        report_notes: response.data.report_notes_count || 0,
        company_notes: response.data.company_notes_count || 0,
      });
      setRecordNotesMap(response.data.record_notes_map || {});
    } catch (err) {
      console.error('Error fetching notes stats:', err);
    }
  }, [reportId]);

  // Create a new note
  const createNote = useCallback(async (noteData) => {
    try {
      const response = await api.post('/api/client/notes/', {
        report_id: reportId,
        ...noteData,
      });
      
      // Refresh notes
      await fetchNotes();
      await fetchNotesStats();
      
      return response.data;
    } catch (err) {
      console.error('Error creating note:', err);
      throw err;
    }
  }, [reportId, fetchNotes, fetchNotesStats]);

  // Update a note
  const updateNote = useCallback(async (noteId, noteData) => {
    try {
      const response = await api.patch(`/api/client/notes/${noteId}/`, noteData);
      
      // Refresh notes
      await fetchNotes();
      
      return response.data;
    } catch (err) {
      console.error('Error updating note:', err);
      throw err;
    }
  }, [fetchNotes]);

  // Delete a note
  const deleteNote = useCallback(async (noteId) => {
    try {
      await api.delete(`/api/client/notes/${noteId}/`);
      
      // Refresh notes
      await fetchNotes();
      await fetchNotesStats();
    } catch (err) {
      console.error('Error deleting note:', err);
      throw err;
    }
  }, [fetchNotes, fetchNotesStats]);

  // Toggle pin status
  const togglePin = useCallback(async (noteId, currentPinStatus) => {
    try {
      await api.patch(`/api/client/notes/${noteId}/`, {
        is_pinned: !currentPinStatus,
      });
      
      // Refresh notes
      await fetchNotes();
    } catch (err) {
      console.error('Error toggling pin:', err);
      throw err;
    }
  }, [fetchNotes]);

  // Get note count for a specific record
  const getNoteCountForRecord = useCallback((recordId) => {
    return recordNotesMap[recordId] || 0;
  }, [recordNotesMap]);

  // Get notes for a specific record
  const getNotesForRecord = useCallback((recordId) => {
    return notes.filter(note => note.record_id === recordId);
  }, [notes]);

  // Get report-level notes only
  const getReportNotes = useCallback(() => {
    return notes.filter(note => note.is_report_note);
  }, [notes]);

  // Initial fetch
  useEffect(() => {
    if (reportId) {
      fetchNotes();
      fetchNotesStats();
    }
  }, [reportId]);

  return {
    notes,
    stats,
    recordNotesMap,
    loading,
    error,
    fetchNotes,
    fetchNotesStats,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    getNoteCountForRecord,
    getNotesForRecord,
    getReportNotes,
  };
};

export default useClientNotes;
