import React from 'react';
import type { QuickButton } from '../types';

interface QuickButtonsProps {
  buttons: QuickButton[];
  onButtonClick: (value: string) => void;
}

const QuickButtons: React.FC<QuickButtonsProps> = ({
  buttons,
  onButtonClick,
}) => {
  return (
    <div className="p-3 flex gap-2 flex-wrap border-t border-gray-200">
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={() => onButtonClick(button.value)}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full text-xs transition-all hover:-translate-y-0.5"
        >
          {button.label}
        </button>
      ))}
    </div>
  );
};

export default QuickButtons;