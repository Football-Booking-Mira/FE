import React from "react";

interface Props {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<Props> = ({ currentPage, totalPages, onChange }) => {
  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
      <button
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Prev
      </button>

      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          style={{
            fontWeight: currentPage === i + 1 ? "bold" : undefined,
          }}
          onClick={() => onChange(i + 1)}
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
