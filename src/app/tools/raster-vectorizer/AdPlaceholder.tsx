interface AdPlaceholderProps {
  onHide?: () => void;
}

export default function AdPlaceholder({ onHide }: AdPlaceholderProps) {
  return (
    <div className="order-1 lg:order-2 relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 min-h-[120px] flex items-center justify-center">
      <span className="text-sm text-gray-400">Advertisement</span>
      {onHide && (
        <button
          type="button"
          onClick={onHide}
          className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          Hide
        </button>
      )}
    </div>
  );
}
