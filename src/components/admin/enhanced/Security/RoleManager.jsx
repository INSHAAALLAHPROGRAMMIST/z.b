import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import authService, { ROLES, PERMISSIONS } from '../../../../services/AuthService';
import ProtectedRoute from './ProtectedRoute';

const RoleManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('email');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'adminUsers'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'adminUsers', userId), {
        role: newRole,
        updatedAt: new Date(),
        updatedBy: authService.getCurrentUser().user.uid
      });

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role');
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'adminUsers', userId), {
        isActive: !currentStatus,
        updatedAt: new Date(),
        updatedBy: authService.getCurrentUser().user.uid
      });

      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'adminUsers', userId));
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'email':
        return (a.email || '').localeCompare(b.email || '');
      case 'role':
        return (a.role || '').localeCompare(b.role || '');
      case 'createdAt':
        return new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0);
      case 'lastLogin':
        return new Date(b.lastLogin?.toDate() || 0) - new Date(a.lastLogin?.toDate() || 0);
      default:
        return 0;
    }
  });

  const getRoleColor = (role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN: return 'bg-red-100 text-red-800';
      case ROLES.ADMIN: return 'bg-blue-100 text-blue-800';
      case ROLES.MODERATOR: return 'bg-green-100 text-green-800';
      case ROLES.VIEWER: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRolePermissions = (role) => {
    const rolePermissions = {
      [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS).length,
      [ROLES.ADMIN]: 20,
      [ROLES.MODERATOR]: 11,
      [ROLES.VIEWER]: 6
    };
    return rolePermissions[role] || 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_ROLES}>
      <div className="role-manager">
        <div className="role-manager-header">
          <h2>Role & User Management</h2>
          <p>Manage admin users, roles, and permissions</p>
        </div>

        {/* Filters and Search */}
        <div className="role-manager-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-controls">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.MODERATOR}>Moderator</option>
              <option value={ROLES.VIEWER}>Viewer</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="createdAt">Sort by Created Date</option>
              <option value="lastLogin">Sort by Last Login</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="user-email">{user.email}</div>
                        <div className="user-id">ID: {user.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${getRoleColor(user.role)}`}>
                      {user.role?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="permissions-count">
                      {getRolePermissions(user.role)} permissions
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {user.lastLogin ? 
                      new Date(user.lastLogin.toDate()).toLocaleDateString() : 
                      'Never'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRoleModal(true);
                        }}
                        className="btn-edit"
                        title="Change Role"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleUserStatusToggle(user.id, user.isActive)}
                        className={`btn-toggle ${user.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                        title={user.isActive ? 'Deactivate User' : 'Activate User'}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      {authService.hasRole(ROLES.SUPER_ADMIN) && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="btn-delete"
                          title="Delete User"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Role Change Modal */}
        {showRoleModal && selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Change User Role</h3>
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <p>Change role for: <strong>{selectedUser.email}</strong></p>
                <p>Current role: <strong>{selectedUser.role}</strong></p>
                
                <div className="role-options">
                  {Object.values(ROLES).map(role => (
                    <div key={role} className="role-option">
                      <label>
                        <input
                          type="radio"
                          name="newRole"
                          value={role}
                          defaultChecked={role === selectedUser.role}
                        />
                        <span className={`role-label ${getRoleColor(role)}`}>
                          {role.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="role-permissions">
                          ({getRolePermissions(role)} permissions)
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const newRole = document.querySelector('input[name="newRole"]:checked')?.value;
                    if (newRole && newRole !== selectedUser.role) {
                      handleRoleChange(selectedUser.id, newRole);
                    } else {
                      setShowRoleModal(false);
                    }
                  }}
                  className="btn-save"
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="role-stats">
          <div className="stat-card">
            <h4>Total Users</h4>
            <span className="stat-number">{users.length}</span>
          </div>
          <div className="stat-card">
            <h4>Active Users</h4>
            <span className="stat-number">{users.filter(u => u.isActive).length}</span>
          </div>
          <div className="stat-card">
            <h4>Super Admins</h4>
            <span className="stat-number">{users.filter(u => u.role === ROLES.SUPER_ADMIN).length}</span>
          </div>
          <div className="stat-card">
            <h4>Admins</h4>
            <span className="stat-number">{users.filter(u => u.role === ROLES.ADMIN).length}</span>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default RoleManager;