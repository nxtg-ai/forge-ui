/**
 * Memory Widget
 * Editable memory items for persistent context storage
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Edit2,
  Trash2,
  Plus,
  Save,
  X,
  Calendar,
  Tag
} from 'lucide-react';

export interface MemoryItem {
  id: string;
  content: string;
  tags: string[];
  created: Date;
  updated: Date;
  category: 'decision' | 'instruction' | 'learning' | 'context' | 'other';
}

interface MemoryWidgetProps {
  items: MemoryItem[];
  onAdd: (content: string, category: MemoryItem['category'], tags: string[]) => void;
  onEdit: (id: string, content: string, tags: string[]) => void;
  onDelete: (id: string) => void;
  className?: string;
  hasFiles?: boolean;
}

export const MemoryWidget: React.FC<MemoryWidgetProps> = ({
  items,
  onAdd,
  onEdit,
  onDelete,
  className = '',
  hasFiles = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('context');
  const [newTags, setNewTags] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  const handleAdd = () => {
    if (newContent.trim()) {
      onAdd(
        newContent.trim(),
        newCategory,
        newTags.split(',').map(t => t.trim()).filter(Boolean)
      );
      setNewContent('');
      setNewTags('');
      setNewCategory('context');
      setIsAdding(false);
    }
  };

  const handleEdit = (id: string) => {
    if (editContent.trim()) {
      onEdit(
        id,
        editContent.trim(),
        editTags.split(',').map(t => t.trim()).filter(Boolean)
      );
      setEditingId(null);
      setEditContent('');
      setEditTags('');
    }
  };

  const startEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
    setEditTags(item.tags.join(', '));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditTags('');
  };

  const getCategoryColor = (category: MemoryItem['category']) => {
    switch (category) {
      case 'decision': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'instruction': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'learning': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'context': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-semibold text-gray-200">Memory</h4>
          <span className="text-xs text-gray-500">({items.length})</span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20
                   border border-purple-500/20 transition-all group"
          title="Add memory"
        >
          {isAdding ? (
            <X className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <Plus className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Add Memory Form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2"
        >
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as MemoryItem['category'])}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300
                     focus:outline-none focus:border-purple-500/50"
          >
            <option value="decision">Decision</option>
            <option value="instruction">Instruction</option>
            <option value="learning">Learning</option>
            <option value="context">Context</option>
            <option value="other">Other</option>
          </select>

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Enter memory content..."
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300
                     placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
            rows={3}
            autoFocus
          />

          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300
                     placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          />

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30
                       rounded text-xs text-purple-400 font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewContent('');
                setNewTags('');
              }}
              className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600
                       rounded text-xs text-gray-400 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Memory Items */}
      <div className={hasFiles
        ? "space-y-2 max-h-64 overflow-y-auto"
        : "space-y-2 flex-1 min-h-0 overflow-y-auto"
      }>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
            No memories stored yet
          </div>
        ) : (
          items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-2.5 space-y-2"
            >
              {editingId === item.id ? (
                /* Edit Mode */
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300
                             focus:outline-none focus:border-purple-500/50 resize-none"
                    rows={3}
                    autoFocus
                  />

                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300
                             placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item.id)}
                      className="flex-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30
                               rounded text-xs text-purple-400 transition-all flex items-center justify-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-1 bg-gray-700/50 hover:bg-gray-700 border border-gray-600
                               rounded text-xs text-gray-400 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Category Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1 rounded hover:bg-gray-700/50 transition-colors group"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3 text-gray-500 group-hover:text-purple-400" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1 rounded hover:bg-red-500/10 transition-colors group"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 text-gray-500 group-hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {item.content}
                  </p>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-gray-700/50 border border-gray-600 rounded text-xs text-gray-400
                                   flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.updated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
