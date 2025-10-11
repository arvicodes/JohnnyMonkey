import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Eye, Users, FileText, Calendar, Loader2 } from 'lucide-react';

interface SubmissionViewerProps {
  fileName: string;
  filePath: string;
  teacherId: string;
  onClose: () => void;
}

const SubmissionViewer: React.FC<SubmissionViewerProps> = ({
  fileName,
  filePath,
  teacherId,
  onClose
}) => {
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      
      // Erstelle oder hole Assignment
      const assignmentResponse = await fetch('/api/submissions/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, filePath, teacherId })
      });

      if (!assignmentResponse.ok) throw new Error('Fehler beim Laden des Assignments');
      
      const assignmentData = await assignmentResponse.json();
      setAssignment(assignmentData);

      // Hole alle Submissions
      const submissionsResponse = await fetch(
        `/api/submissions/assignment/${assignmentData.id}/submissions`
      );

      if (!submissionsResponse.ok) throw new Error('Fehler beim Laden der Abgaben');

      const submissionsData = await submissionsResponse.json();
      setSubmissions(submissionsData);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Fehler beim Laden der Abgaben');
    } finally {
      setLoading(false);
    }
  };

  const currentSubmission = submissions[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : submissions.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < submissions.length - 1 ? prev + 1 : 0));
  };

  const handleViewSubmission = () => {
    if (!currentSubmission) return;
    window.open(`/api/submissions/download/${currentSubmission.id}`, '_blank');
  };

  const handleDownloadSubmission = () => {
    if (!currentSubmission) return;
    window.open(`/api/submissions/download/${currentSubmission.id}`, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Lade Abgaben...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">📚 Schüler-Abgaben</h2>
              <p className="text-purple-100 text-sm">{fileName}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-semibold">{submissions.length} Abgaben</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-900">Fehler</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="bg-gray-100 rounded-full p-6">
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Noch keine Abgaben
              </h3>
              <p className="text-gray-600">
                Bisher hat kein Schüler eine Abgabe hochgeladen.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Navigation */}
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 px-4 py-2 rounded-lg transition-colors border border-blue-200 font-semibold"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Zurück
                </button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Abgabe</p>
                  <p className="text-xl font-bold text-gray-900">
                    {currentIndex + 1} / {submissions.length}
                  </p>
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 px-4 py-2 rounded-lg transition-colors border border-blue-200 font-semibold"
                >
                  Weiter
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Aktuelle Abgabe */}
              {currentSubmission && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg">
                  {/* Schüler-Info */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-blue-200">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-3xl shadow-lg">
                      {currentSubmission.student.avatarEmoji || '👤'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {currentSubmission.student.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Eingereicht: {formatDate(currentSubmission.submittedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Datei-Details */}
                  <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-blue-100">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 rounded-lg p-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg mb-3">
                          📎 Hochgeladene Datei
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start">
                            <span className="text-gray-600 w-24 shrink-0">Dateiname:</span>
                            <span className="font-semibold text-gray-900 break-all">
                              {currentSubmission.originalFileName}
                            </span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-600 w-24 shrink-0">Größe:</span>
                            <span className="font-semibold text-gray-900">
                              {formatFileSize(currentSubmission.fileSize)}
                            </span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-600 w-24 shrink-0">Typ:</span>
                            <span className="font-semibold text-gray-900">
                              {currentSubmission.fileType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleViewSubmission}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Eye className="w-5 h-5" />
                      Datei anzeigen
                    </button>
                    <button
                      onClick={handleDownloadSubmission}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Download className="w-5 h-5" />
                      Herunterladen
                    </button>
                  </div>
                </div>
              )}

              {/* Übersicht aller Abgaben */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-700" />
                  Alle Abgaben ({submissions.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {submissions.map((sub, index) => (
                    <button
                      key={sub.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        index === currentIndex
                          ? 'bg-blue-100 border-2 border-blue-400 shadow-md'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{sub.student.avatarEmoji || '👤'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {sub.student.name}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {sub.originalFileName}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(sub.submittedAt).split(',')[0]}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionViewer;

