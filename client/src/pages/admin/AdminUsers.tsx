import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { User, Trash2, Plus, X } from "lucide-react";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for toggling the form
  const [showAddForm, setShowAddForm] = useState(false);

  // State for the new user input
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, roleRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/roles"),
      ]);
      setUsers(userRes.data);
      setRoles(roleRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Create User Function
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/users", newUser);
      alert("User Created Successfully!");

      // Reset and close form
      setShowAddForm(false);
      setNewUser({ name: "", email: "", password: "", roleId: "" });

      // Refresh list
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create user");
    }
  };

  // 2. Delete User Function
  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure? This will delete the user permanently."))
      return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchData(); // Refresh list
    } catch (err) {
      alert("Delete failed");
    }
  };

  // 3. Change Role Function
  const handleRoleChange = async (userId: number, newRoleId: string) => {
    // Optimistic UI Update (Change it instantly on screen)
    const updatedUsers = users.map((u: any) =>
      u.id === userId ? { ...u, roleId: Number(newRoleId) } : u
    );
    setUsers(updatedUsers as any);

    try {
      await api.put("/admin/users/role", {
        userId,
        roleId: newRoleId,
      });
    } catch (err) {
      alert("Failed to update role");
      fetchData(); // Revert on error
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* HEADER: Title + Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Employees & Customers
        </h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? "Close" : "Add Employee"}
        </button>
      </div>

      {/* CREATE USER FORM (Only shows if showAddForm is true) */}
      {showAddForm && (
        <div className="bg-gray-100 p-6 rounded-lg mb-8 border border-gray-200">
          <h3 className="font-bold mb-4 text-lg">Create New Employee</h3>
          <form
            onSubmit={handleCreateUser}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Full Name
              </label>
              <input
                required
                placeholder="e.g. John Doe"
                className="w-full p-2 rounded border focus:ring-black focus:border-black"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Email
              </label>
              <input
                required
                type="email"
                placeholder="john@work.com"
                className="w-full p-2 rounded border focus:ring-black focus:border-black"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Password
              </label>
              <input
                required
                type="password"
                placeholder="******"
                className="w-full p-2 rounded border focus:ring-black focus:border-black"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                Role
              </label>
              <select
                className="w-full p-2 rounded border focus:ring-black focus:border-black"
                value={newUser.roleId}
                onChange={(e) =>
                  setNewUser({ ...newUser, roleId: e.target.value })
                }
              >
                <option value="">Select Role...</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 transition-colors"
            >
              Create User
            </button>
          </form>
        </div>
      )}

      {/* USERS LIST TABLE */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 font-bold border-b">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-4 flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <User size={16} />
                  </div>
                  <span className="font-medium text-black">{user.name}</span>
                </td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">
                  <select
                    className={`border p-1 rounded text-sm focus:ring-black focus:border-black cursor-pointer font-medium
                                    ${
                                      user.roleId
                                        ? "bg-blue-50 text-blue-800 border-blue-200"
                                        : "bg-gray-50 text-gray-600"
                                    }`}
                    value={user.roleId || ""}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={user.email === "admin@comfortclothing.com"}
                  >
                    <option value="">Customer (No Access)</option>
                    {roles.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                    title="Delete User"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
