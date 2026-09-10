import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UploadArea from '../../components/admin/knowledge/UploadArea';
import DocumentTable from '../../components/admin/knowledge/DocumentTable';
import EnterpriseDrawer from '../../components/admin/knowledge/EnterpriseDrawer';
import { fetchDocuments, deleteDocument } from '../../services/knowledgeApi';
import '../../components/admin/knowledge/knowledge.css';

export default function KnowledgeBase() {
  const queryClient = useQueryClient();
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documentsData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['knowledgeDocuments'],
    queryFn: () => fetchDocuments()
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['knowledgeDashboard'] });
    }
  });

  const handleRowClick = (docId) => {
    setSelectedDocId(docId);
    setIsDrawerOpen(true);
  };

  const handleDelete = (docId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(docId);
    }
  };

  // Basic client side filter for demonstration
  const docs = documentsData?.data || [];
  const filteredDocs = docs.filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="knowledge-base-container">
      <div className="knowledge-header-row">
        <div className="knowledge-header-text">
          <h1>Knowledge Base (RAG)</h1>
          <p>Automated Document Pipeline: Upload documents to automatically extract, chunk, and vectorize them into MongoDB.</p>
        </div>
        <button className="btn-primary upload-btn" onClick={() => document.getElementById('upload-input').click()}>
          <i className="fas fa-upload"></i> Upload Document
        </button>
      </div>

      <UploadArea onSuccess={() => queryClient.invalidateQueries()} />

      <div className="table-wrapper overflow-x-auto">
        <div className="table-controls">
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input 
              type="text" 
              placeholder="Search knowledge files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sync-status">
            <i className="fas fa-database"></i> MongoDB Sync Active
          </div>
        </div>

        <DocumentTable 
          documents={filteredDocs} 
          isLoading={isLoadingDocs}
          onRowClick={handleRowClick}
          onDelete={handleDelete}
        />
      </div>

      {isDrawerOpen && selectedDocId && (
        <EnterpriseDrawer 
          docId={selectedDocId} 
          onClose={() => setIsDrawerOpen(false)} 
        />
      )}
    </div>
  );
}
