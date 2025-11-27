import React from "react";
import { usePagination } from "../common/hooks/usePagination";
import Pagination from "../common/components/Pagination";

const mockUsers = Array.from({ length: 95 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

const UserListPage = () => {
  const { currentData, currentPage, totalPages, goToPage } = usePagination({
    data: mockUsers,
    itemsPerPage: 10,
  });

  return (
    <div>
      <h2>User List</h2>
      <ul>
        {currentData.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={goToPage}
      />
    </div>
  );
};

export default UserListPage;
