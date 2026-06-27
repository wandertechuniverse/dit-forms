import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, User, FileText, Calendar, Hash, CheckCircle2,
  XCircle, Clock, ExternalLink,
} from 'lucide-react';

export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadSubmission(); }, [id]);

  const loadSubmission = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/submissions/${id}`);
      setSubmission(res);
    } catch (err) {
      toast.error(err.message);
      navigate('/submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (status) => {
    setActionLoading(true);
    try {
      await api.put(`/submissions/${id}/status`, { status });
      toast.success(`Submission ${status}`);
      loadSubmission();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/submissions')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Submissions
      </button>

      {/* Student Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <User className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {submission.studentMatch?.fullNameSnapshot || 'Unknown Student'}
            </h1>
            <p className="text-gray-500">
              ID: {submission.studentMatch?.idNumberSnapshot || '—'}
            </p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={submission.status} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <InfoCard icon={Calendar} label="Submitted" value={formatDate(submission.submittedAt)} />
          <InfoCard icon={FileText} label="Form" value={submission.formDefinitionId?.slice(-8) || '—'} />
          <InfoCard icon={Hash} label="Submission ID" value={submission.id?.slice(-8) || '—'} mono />
        </div>
      </div>

      {/* Form Answers */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Submission Answers</h2>

        {submission.responses?.length > 0 ? (
          <div className="space-y-4">
            {submission.responses.map((resp, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  {resp.fieldLabel || resp.fieldId || `Field ${i + 1}`}
                </div>
                <div className="text-gray-900">
                  {renderAnswer(resp)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No answers recorded.</p>
        )}
      </div>

      {/* Files */}
      {submission.fileIds?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attached Files</h2>
          <div className="space-y-2">
            {submission.fileIds.map((fileId) => (
              <FileRow key={fileId} fileId={fileId} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex gap-3">
          {submission.status !== 'approved' && (
            <button
              onClick={() => handleStatus('approved')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Approve
            </button>
          )}
          {submission.status !== 'rejected' && (
            <button
              onClick={() => handleStatus('rejected')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-5 h-5" />}
              Reject
            </button>
          )}
          {submission.status !== 'reviewed' && (
            <button
              onClick={() => handleStatus('reviewed')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-5 h-5" />}
              Mark Reviewed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, mono }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function FileRow({ fileId }) {
  const [file, setFile] = useState(null);
  useEffect(() => { api.get(`/files/${fileId}`).then(setFile).catch(() => {}); }, [fileId]);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div>
        <p className="text-sm font-medium text-gray-900">{file?.originalFilename || fileId}</p>
        <p className="text-xs text-gray-500">{file?.mimeType || 'Unknown type'}</p>
      </div>
      {file?.downloadUrl && (
        <a
          href={file.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Download <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800',
    reviewed: 'bg-blue-100 text-blue-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status || 'unknown'}
    </span>
  );
}

function renderAnswer(resp) {
  if (resp.answerText) return <span>{resp.answerText}</span>;
  if (resp.answerNumber !== undefined && resp.answerNumber !== null) return <span>{resp.answerNumber}</span>;
  if (resp.answerBool !== undefined) return <span>{resp.answerBool ? 'Yes' : 'No'}</span>;
  if (resp.answerDate) return <span>{formatDate(resp.answerDate)}</span>;
  if (resp.answerFileIds?.length > 0) return <span className="text-indigo-600">{resp.answerFileIds.length} file(s) attached</span>;
  return <span className="text-gray-400 italic">No answer</span>;
}
