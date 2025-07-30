import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import {
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface SystemInstruction {
  _id: string;
  category: string;
  instruction: string;
  isActive: boolean;
  createdBy: {
    name: string;
    email: string;
  };
  updatedBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Message {
  type: 'success' | 'error' | '';
  content: string;
}

const SystemInstructions: React.FC = () => {
  const { user } = useAuth();
  const [instructions, setInstructions] = useState<SystemInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>({ type: '', content: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<SystemInstruction | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    instruction: ''
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

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchInstructions();
    }
  }, [user]);

  const fetchInstructions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/system-instructions');
      setInstructions(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching instructions:', error);
      setMessage({ 
        type: 'error', 
        content: error.response?.data?.message || 'Failed to fetch system instructions' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.instruction.trim()) {
      setMessage({ type: 'error', content: 'Please fill in all fields.' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', content: '' });
      
      let response;
      if (editingInstruction) {
        response = await axios.put(`/system-instructions/${editingInstruction._id}`, formData);
      } else {
        response = await axios.post('/system-instructions', formData);
      }
      
      setMessage({ 
        type: 'success', 
        content: response.data.message || 'System instruction saved successfully!' 
      });
      
      // Reset form
      setFormData({ category: '', instruction: '' });
      setShowForm(false);
      setEditingInstruction(null);
      
      // Refresh instructions list
      fetchInstructions();
      
    } catch (error: any) {
      console.error('Save error:', error);
      setMessage({ 
        type: 'error', 
        content: error.response?.data?.message || 'Failed to save system instruction' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (instruction: SystemInstruction) => {
    setEditingInstruction(instruction);
    setFormData({
      category: instruction.category,
      instruction: instruction.instruction
    });
    setShowForm(true);
  };

  const handleToggleActive = async (instructionId: string) => {
    try {
      const response = await axios.put(`/system-instructions/${instructionId}/toggle`);
      setMessage({ 
        type: 'success', 
        content: response.data.message || 'Status updated successfully!' 
      });
      fetchInstructions();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        content: error.response?.data?.message || 'Failed to update status' 
      });
    }
  };

  const handleDelete = async (instructionId: string) => {
    if (!window.confirm('Are you sure you want to delete this system instruction?')) {
      return;
    }

    try {
      await axios.delete(`/system-instructions/${instructionId}`);
      setMessage({ type: 'success', content: 'System instruction deleted successfully!' });
      fetchInstructions();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        content: error.response?.data?.message || 'Failed to delete system instruction' 
      });
    }
  };

  const resetForm = () => {
    setFormData({ category: '', instruction: '' });
    setShowForm(false);
    setEditingInstruction(null);
    setMessage({ type: '', content: '' });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <CogIcon className="h-8 w-8 mr-3 text-primary-600" />
                System Instructions
              </h1>
              <p className="text-gray-600 mt-2">
                Manage category-specific instructions for the AI assistant
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Instruction
            </button>
          </div>
        </div>

        {/* Message */}
        {message.content && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : (
                <XCircleIcon className="h-5 w-5 mr-2" />
              )}
              {message.content}
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingInstruction ? 'Edit System Instruction' : 'Add New System Instruction'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={!!editingInstruction}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruction
                </label>
                <textarea
                  value={formData.instruction}
                  onChange={(e) => setFormData(prev => ({ ...prev, instruction: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter specific instructions for this category..."
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  These instructions will be added to the base system prompt when handling queries in this category.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Saving...</span>
                    </>
                  ) : (
                    editingInstruction ? 'Update Instruction' : 'Add Instruction'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Instructions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              System Instructions ({instructions.length})
            </h2>
          </div>
          
          {instructions.length === 0 ? (
            <div className="p-8 text-center">
              <CogIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No system instructions configured yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {instructions.map((instruction) => (
                <div key={instruction._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {instruction.category}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          instruction.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {instruction.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3 whitespace-pre-wrap">
                        {instruction.instruction}
                      </p>
                      
                      <div className="text-sm text-gray-500">
                        <p>Created by {instruction.createdBy.name} on {new Date(instruction.createdAt).toLocaleDateString()}</p>
                        {instruction.updatedBy && (
                          <p>Last updated by {instruction.updatedBy.name} on {new Date(instruction.updatedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(instruction._id)}
                        className={`p-2 rounded-md transition-colors ${
                          instruction.isActive
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={instruction.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => handleEdit(instruction)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit instruction"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(instruction._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete instruction"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemInstructions;