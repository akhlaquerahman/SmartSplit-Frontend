import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AIPageHeader from '../components/AIPageHeader';
import { Upload, FileText, Search, Trash2, RefreshCw, Eye, Database } from 'lucide-react';
import { fetchDocuments, deleteDocument, uploadDocument } from '../../../services/knowledgeApi';
import EnterpriseDrawer from '../../../components/admin/knowledge/EnterpriseDrawer';

const KnowledgeBase = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['knowledgeDocuments'],
    queryFn: () => fetchDocuments()
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeDocuments'] });
    }
  });

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('type', file.name.split('.').pop().toUpperCase());

      await uploadDocument(formData);
      queryClient.invalidateQueries({ queryKey: ['knowledgeDocuments'] });
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDelete = (docId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(docId);
    }
  };

  const handleRowClick = (docId) => {
    setSelectedDocId(docId);
    setIsDrawerOpen(true);
  };

  const docs = documentsData?.data || [];
  const filteredDocs = docs.filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-500 p-2 md:p-6 pb-20">
      <AIPageHeader 
        title="Knowledge Base (RAG)" 
        description="Automated Document Pipeline: Upload documents to automatically extract, chunk, and vectorize them into MongoDB."
        action={
          <button 
            onClick={() => document.getElementById('upload-input').click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition font-medium shadow-sm disabled:opacity-50"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        }
      />
      
      {/* Upload Zone */}
      <div 
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
        onClick={() => document.getElementById('upload-input').click()}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center mb-8 text-center cursor-pointer transition group ${isDragging ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30' : 'border-blue-300 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
      >
        <input type="file" id="upload-input" className="hidden" onChange={handleChange} />
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
          {uploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
        </div>
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
          {uploading ? 'Uploading...' : 'Drag & drop enterprise documents here'}
        </h3>
        <p className="text-sm text-blue-600/70 dark:text-blue-400/70 max-w-md">The pipeline will automatically Extract, Clean, Chunk, Embed, and Index into MongoDB. (PDF, DOCX, TXT, CSV, MD up to 50MB)</p>
      </div>

      {/* Document List */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search knowledge files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
             <span className="flex items-center gap-1"><Database className="w-4 h-4 text-emerald-500" /> MongoDB Sync Active</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-black/50 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="p-4">Document</th>
                <th className="p-4">Status</th>
                <th className="p-4">Chunks (Tokens)</th>
                <th className="p-4">Uploader</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">Loading documents...</td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No documents found. Upload one to get started.</td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleRowClick(doc._id)}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{doc.title}</p>
                          <p className="text-xs text-gray-500">{doc.type} • {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex w-max items-center gap-1 ${doc.status === 'Indexed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : doc.status === 'Failed' ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30'}`}>
                        {doc.status === 'Processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.totalChunks || 0} chunks</span>
                        {doc.totalTokens > 0 && <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">~{doc.totalTokens} tkns</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400 font-medium">{doc.uploader?.name || 'System'}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-1">
                      <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-500 transition tooltip" title="Preview Chunks" onClick={(e) => { e.stopPropagation(); handleRowClick(doc._id); }}><Eye className="w-4 h-4" /></button>
                      <button className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded text-emerald-500 transition tooltip" title="Refresh" onClick={(e) => { e.stopPropagation(); queryClient.invalidateQueries(); }}><RefreshCw className="w-4 h-4" /></button>
                      <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 transition tooltip" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDrawerOpen && selectedDocId && (
        <EnterpriseDrawer 
          docId={selectedDocId} 
          onClose={() => setIsDrawerOpen(false)} 
        />
      )}
    </div>
  );
};
export default KnowledgeBase;