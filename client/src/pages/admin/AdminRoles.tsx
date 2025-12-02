import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Shield, Save, Plus, Trash2 } from 'lucide-react';

const AdminRoles = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]); // List of all available permissions from DB
  
  // State for Creating/Editing a Role
  const [editingRole, setEditingRole] = useState<any>(null); // null means list mode
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<number[]>([]);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      const [roleRes, permRes] = await Promise.all([
        api.get('/admin/roles'), // We need to create this route!
        api.get('/admin/permissions') // We need to create this route!
      ]);
      setRoles(roleRes.data);
      setPermissions(permRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRole = async () => {
    try {
        await api.post('/admin/roles', {
            name: newRoleName,
            permissions: selectedPerms
        });
        alert("Role Created!");
        setEditingRole(null);
        setNewRoleName('');
        setSelectedPerms([]);
        fetchRolesAndPermissions();
    } catch (err) {
        alert("Failed to create role");
    }
  };

  const togglePerm = (id: number) => {
    if (selectedPerms.includes(id)) {
        setSelectedPerms(selectedPerms.filter(pid => pid !== id));
    } else {
        setSelectedPerms([...selectedPerms, id]);
    }
  };

  // 1. CREATE MODE
  if (editingRole === 'NEW') {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Create New Role</h1>
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="mb-6">
                    <label className="block text-sm font-bold mb-2">Role Name</label>
                    <input 
                        className="border p-2 rounded w-full max-w-md" 
                        placeholder="e.g. Sales Manager"
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                    />
                </div>
                
                <h3 className="font-bold mb-4">Assign Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {permissions.map((p: any) => (
                        <label key={p.id} className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                            <input 
                                type="checkbox" 
                                className="mt-1"
                                checked={selectedPerms.includes(p.id)}
                                onChange={() => togglePerm(p.id)}
                            />
                            <div>
                                <span className="block font-medium text-sm">{p.action}</span>
                                <span className="text-xs text-gray-500">{p.description}</span>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button onClick={handleSaveRole} className="bg-black text-white px-6 py-2 rounded font-bold flex items-center gap-2">
                        <Save size={18} /> Save Role
                    </button>
                    <button onClick={() => setEditingRole(null)} className="text-gray-500 px-6 py-2">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // 2. LIST MODE
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <button 
            onClick={() => setEditingRole('NEW')} 
            className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800"
        >
            <Plus size={20} /> Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role: any) => (
            <div key={role.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-gray-100 p-2 rounded">
                        <Shield size={24} className="text-gray-700" />
                    </div>
                    {role.name !== 'SuperAdmin' && (
                        <button className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                    )}
                </div>
                <h3 className="text-xl font-bold mb-2">{role.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{role.description || 'No description'}</p>
                
                <div className="border-t pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Permissions</p>
                    <div className="flex flex-wrap gap-2">
                        {role.permissions.map((rp: any) => (
                            <span key={rp.permission.id} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded">
                                {rp.permission.action}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRoles;