import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Upload,
  FileText,
  Image,
  CreditCard,
  Trash2,
  Download,
  Loader2,
  User,
  Clock,
} from 'lucide-react';

import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import {
  getCustomer,
  uploadCustomerDocument,
  deleteCustomerDocument,
} from '../../services/customerApi';
import { downloadAttachment } from '../../services/attachmentApi';
import type { CustomerDocument } from '../../types/CustomerTypes';

// Document type labels
const docTypeLabels: Record<string, { label: string; icon: typeof FileText }> = {
  valid_id: { label: 'Valid ID', icon: CreditCard },
  document: { label: 'Document', icon: FileText },
  photo: { label: 'Photo', icon: Image },
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');
  const [uploadType, setUploadType] = useState<string>('valid_id');
  const [deleteDoc, setDeleteDoc] = useState<CustomerDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Query ───────────────────────────
  const { data: response, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(Number(id)),
    enabled: !!id,
  });

  const customer = response?.data;

  // ─── Upload Mutation ─────────────────
  const uploadMutation = useMutation({
    mutationFn: ({ file, docType }: { file: File; docType: string }) =>
      uploadCustomerDocument(Number(id), file, docType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      showToast('Document uploaded successfully.');
    },
    onError: () => showToast('Failed to upload document.', 'error'),
  });

  // ─── Delete Doc Mutation ─────────────
  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => deleteCustomerDocument(Number(id), docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      showToast('Document deleted.');
      setDeleteDoc(null);
    },
    onError: () => showToast('Failed to delete document.', 'error'),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ file, docType: uploadType });
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // ─── Loading ────────────────────────
  if (isLoading || !customer) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const documents = customer.documents ?? [];

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'documents' as const, label: `Documents (${documents.length})` },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/customers')}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Customer Profile</h1>
          <p className="text-sm text-slate-500">{customer.customer_code}</p>
        </div>
        <button
          onClick={() => navigate(`/dashboard/customers/${id}/edit`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">
                {customer.first_name} {customer.middle_name ? customer.middle_name + ' ' : ''}{customer.last_name}
                {customer.suffix ? ` ${customer.suffix}` : ''}
              </h2>
              <StatusBadge status={customer.status} size="md" />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium capitalize">
                {customer.customer_type === 'corporate' ? (
                  <Building2 className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                {customer.customer_type}
              </span>
            </div>

            {customer.company_name && (
              <p className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                {customer.company_name}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" />
                {customer.email}
              </span>
              {customer.mobile && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {customer.mobile}
                </span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {customer.city}{customer.province ? `, ${customer.province}` : ''}
                </span>
              )}
              {customer.date_of_birth && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {new Date(customer.date_of_birth).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 border border-slate-200 border-b-white -mb-px'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Contact Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Email</dt>
                <dd className="text-slate-800 font-medium">{customer.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-800">{customer.phone || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Mobile</dt>
                <dd className="text-slate-800">{customer.mobile || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Address</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Line 1</dt>
                <dd className="text-slate-800">{customer.address_line_1 || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Line 2</dt>
                <dd className="text-slate-800">{customer.address_line_2 || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">City</dt>
                <dd className="text-slate-800">{customer.city || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Province</dt>
                <dd className="text-slate-800">{customer.province || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Zip Code</dt>
                <dd className="text-slate-800">{customer.zip_code || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Additional Information</h3>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-slate-500 mb-1">Gender</dt>
                <dd className="text-slate-800 capitalize">{customer.gender || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-1">TIN</dt>
                <dd className="text-slate-800">{customer.tin || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-1">Registered</dt>
                <dd className="text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {new Date(customer.created_at).toLocaleDateString()}
                </dd>
              </div>
              {customer.notes && (
                <div className="md:col-span-3">
                  <dt className="text-slate-500 mb-1">Notes</dt>
                  <dd className="text-slate-800 bg-slate-50 rounded-xl p-3">{customer.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Upload Area */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Upload Document</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Document Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="valid_id">Valid ID</option>
                  <option value="document">Document</option>
                  <option value="photo">Photo</option>
                </select>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 disabled:opacity-50 transition"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadMutation.isPending ? 'Uploading...' : 'Choose File'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Accepted: JPG, PNG, GIF, PDF, DOC, DOCX — Max 10MB
            </p>
          </div>

          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
              {documents.map((doc) => {
                const typeInfo = docTypeLabels[doc.document_type] ?? docTypeLabels.document;
                const DocIcon = typeInfo.icon;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition"
                  >
                    <div className="p-2.5 bg-slate-100 rounded-xl shrink-0">
                      <DocIcon className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                      <p className="text-xs text-slate-500">
                        {typeInfo.label} · {formatFileSize(doc.file_size)} ·{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadAttachment(doc.id, doc.file_name)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteDoc(doc)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Document Modal */}
      <ConfirmModal
        open={!!deleteDoc}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDoc?.file_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteDocMutation.isPending}
        onConfirm={() => deleteDoc && deleteDocMutation.mutate(deleteDoc.id)}
        onCancel={() => setDeleteDoc(null)}
      />
    </div>
  );
}
