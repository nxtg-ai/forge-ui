/**
 * Editable Mission Component
 * Inline editing for vision mission statement
 */

import React, { useState, useEffect, useRef } from "react";
import { Edit3, Save, X } from "lucide-react";

interface EditableMissionProps {
  mission: string;
  isEditing: boolean;
  onSave: (mission: string) => void;
  onCancel: () => void;
  onStartEdit: () => void;
  isLocked: boolean;
}

export const EditableMission: React.FC<EditableMissionProps> = ({
  mission,
  isEditing,
  onSave,
  onCancel,
  onStartEdit,
  isLocked,
}) => {
  const [editValue, setEditValue] = useState(mission);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(mission);
  }, [mission]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                     text-lg text-gray-200 leading-relaxed resize-none
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
          rows={3}
          placeholder="Enter your vision mission..."
          data-testid="vision-mission-input"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(editValue)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white
                       rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            data-testid="vision-mission-save-btn"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300
                       rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            data-testid="vision-mission-cancel-btn"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p
        className="text-lg text-gray-200 leading-relaxed"
        data-testid="vision-mission-text"
      >
        {mission || "No mission defined yet. Click edit to add one."}
      </p>
      {!isLocked && (
        <button
          onClick={onStartEdit}
          className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100
                     bg-gray-800/80 rounded-lg transition-opacity"
          title="Edit mission"
          data-testid="vision-mission-edit-btn"
        >
          <Edit3 className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
};
