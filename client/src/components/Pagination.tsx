import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        // Show first, last, current, and neighbors (simplified for now)
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pages.push(i);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pages.push('...');
        }
    }
    // De-duplicate ... if adjacent (basic implementation)
    // Actually, distinct set is easier.

    // Simple version: Just all pages if < 7, else logic
    // Let's stick to a clean simple render:
    const renderPageNumbers = () => {
        const items = [];

        // Always show First
        items.push(1);

        if (currentPage > 3) items.push('...');

        // Neighbors
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            items.push(i);
        }

        if (currentPage < totalPages - 2) items.push('...');

        // Always show Last
        if (totalPages > 1) items.push(totalPages);

        return items;
    };

    const finalPages = totalPages <= 7 ? Array.from({ length: totalPages }, (_, k) => k + 1) : renderPageNumbers();

    return (
        <div className="flex justify-center items-center gap-2 mt-6">
            <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronLeft size={16} />
            </button>

            {finalPages.map((p, idx) => (
                p === '...' ? (
                    <span key={`dots-${idx}`} className="text-gray-400 px-2">...</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => typeof p === 'number' && onPageChange(p)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentPage === p
                                ? 'bg-black text-white border-black'
                                : 'bg-white border text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {p}
                    </button>
                )
            ))}

            <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="p-2 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
};

export default Pagination;
