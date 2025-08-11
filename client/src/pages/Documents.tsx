import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface Document {
  _id: string;
  title: string;
  category: string;
  type: string;
  publicationDate: string;
  summary: string;
  keywords: Array<{
    term: string;
    termArabic: string;
    weight: number;
  }>;
  status: string;
}

const Documents: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [message, setMessage] = useState({ type: '', content: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    titleArabic: '',
    type: 'other',
    category: 'Civil Law',
    officialNumber: '',
    publicationDate: '',
    effectiveDate: '',
    tags: '',
  });

  const categories = [
    'Civil Law',
    'Criminal Law',
    'Commercial Law',
    'Family Law',
    'Administrative Law',
    'Constitutional Law',
    'Labor Law',
    'Tax Law',
    'Real Estate Law',
    'Intellectual Property'
  ];

  const documentTypes = [
    { value: 'constitution', label: 'Constitution' },
    { value: 'civil_code', label: 'Civil Code' },
    { value: 'criminal_code', label: 'Criminal Code' },
    { value: 'commercial_code', label: 'Commercial Code' },
    { value: 'labor_law', label: 'Labor Law' },
    { value: 'tax_law', label: 'Tax Law' },
    { value: 'administrative_law', label: 'Administrative Law' },
    { value: 'family_law', label: 'Family Law' },
    { value: 'real_estate_law', label: 'Real Estate Law' },
    { value: 'intellectual_property_law', label: 'Intellectual Property Law' },
    { value: 'regulation', label: 'Regulation' },
    { value: 'decree', label: 'Decree' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/documents');
      setDocuments(response.data.documents || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setMessage({ 
        type: 'error', 
        content: error.response?.data?.message || 'Failed to fetch documents' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv'];
      
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        setMessage({ 
          type: 'error', 
          content: 'Invalid file type. Only PDF, DOC, DOCX, TXT, and CSV files are allowed.' 
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setMessage({ 
          type: 'error', 
          content: 'File size must be less than 10MB.' 
        });
        return;
      }
      
      setSelectedFile(file);
      setUploadForm(prev => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
      setMessage({ type: '', content: '' });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setMessage({ type: 'error', content: 'Please select a file to upload.' });
      return;
    }
    
    if (!uploadForm.title.trim()) {
      setMessage({ type: 'error', content: 'Please enter a document title.' });
      return;
    }
    
    if (!uploadForm.titleArabic.trim()) {
      setMessage({ type: 'error', content: 'Please enter an Arabic title.' });
      return;
    }
    
    if (!uploadForm.officialNumber.trim()) {
      setMessage({ type: 'error', content: 'Please enter an official number.' });
      return;
    }
    
    if (!uploadForm.publicationDate) {
      setMessage({ type: 'error', content: 'Please enter a publication date.' });
      return;
    }
    
    if (!uploadForm.effectiveDate) {
      setMessage({ type: 'error', content: 'Please enter an effective date.' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: '', content: '' });
      
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('title', uploadForm.title.trim());
      formData.append('titleArabic', uploadForm.titleArabic.trim());
      formData.append('type', uploadForm.type);
      formData.append('category', uploadForm.category);
      formData.append('officialNumber', uploadForm.officialNumber.trim());
      formData.append('publicationDate', uploadForm.publicationDate);
      formData.append('effectiveDate', uploadForm.effectiveDate);
      formData.append('tags', uploadForm.tags);

      await axios.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ 
        type: 'success', 
        content: 'Document uploaded successfully!' 
      });
      
      // Reset form
      setSelectedFile(null);
      setUploadForm({ 
        title: '', 
        titleArabic: '', 
        type: 'other', 
        category: 'Civil Law', 
        officialNumber: '', 
        publicationDate: '', 
        effectiveDate: '', 
        tags: '' 
      });
      
      // Refresh documents list
      fetchDocuments();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ 
        type: 'error', 
        content: error.response?.data?.message || 'Failed to upload document' 
      });
    } finally {
      setUploading(false);
    }
  };





  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(`/documents/${documentId}`);
      setMessage({ type: 'success', content: 'Document deleted successfully!' });
      fetchDocuments();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        content: error.response?.data?.message || 'Failed to delete document' 
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.summary && doc.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (doc.keywords && doc.keywords.some(keyword => keyword.term.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Legal Documents</h1>
        <p className="text-gray-600">
          Upload and manage legal documents to enhance AI training and legal research.
        </p>
      </div>

      {/* Message Display */}
      {message.content && (
        <div className={`mb-6 p-4 rounded-md flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          )}
          {message.content}
        </div>
      )}

      {/* Upload Section */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CloudArrowUpIcon className="h-6 w-6 mr-2 text-primary-600" />
            Upload Document
          </h2>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title (English)
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter document title in English"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title (Arabic)
                </label>
                <input
                  type="text"
                  value={uploadForm.titleArabic}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, titleArabic: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="أدخل عنوان الوثيقة بالعربية"
                  dir="rtl"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Official Number
                </label>
                <input
                  type="text"
                  value={uploadForm.officialNumber}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, officialNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Law No. 123/2023"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publication Date
                </label>
                <input
                  type="date"
                  value={uploadForm.publicationDate}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, publicationDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={uploadForm.effectiveDate}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., contract, employment, dispute"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, DOC, DOCX, TXT, CSV (max 10MB)
              </p>
            </div>
            
            {selectedFile && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full md:w-auto px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {uploading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Uploading...</span>
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                  Upload Document
                </>
              )}
            </button>
          </form>
        </div>
      )}



      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="md:w-48">
            <div className="relative">
              <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Documents ({filteredDocuments.length})
          </h2>
        </div>
        
        {filteredDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {documents.length === 0 
                ? 'No documents uploaded yet.' 
                : 'No documents match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div key={doc._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        doc.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-3">
                        {doc.category}
                      </span>
                      <span className="mr-4">{doc.type}</span>
                      <span className="mr-4">{doc.status}</span>
                      <span>{new Date(doc.publicationDate).toLocaleDateString()}</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2">{doc.summary || 'No summary available'}</p>
                    
                    {doc.keywords && doc.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.keywords.map((keyword, index) => (
                          <span 
                            key={index}
                            className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                          >
                            {keyword.term}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete document"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;