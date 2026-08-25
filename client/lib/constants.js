// Constants shared across the frontend
export const STATUSES = ['Open', 'In Review', 'Approved', 'Rejected', 'Completed'];
export const REASONS = ['Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind'];
export const RESOLUTIONS = ['Refund', 'Replacement', 'Store Credit'];

// Status → color mapping (Tailwind classes)
export const STATUS_STYLES = {
  'Open':      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-500'   },
  'In Review': { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-500'  },
  'Approved':  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', dot: 'bg-green-500'  },
  'Rejected':  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   dot: 'bg-red-500'    },
  'Completed': { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200',  dot: 'bg-gray-400'   },
};

// Legal transitions map (mirrors the server — used only to show available actions in the UI)
export const LEGAL_TRANSITIONS = {
  'Open':      ['In Review'],
  'In Review': ['Approved', 'Rejected'],
  'Approved':  ['Completed'],
  'Rejected':  [],
  'Completed': [],
};

// Statuses that lock editing
export const DECIDED_STATUSES = ['Approved', 'Rejected', 'Completed'];

// Statuses that allow soft-delete removal
export const REMOVABLE_STATUSES = ['Open', 'Rejected'];
