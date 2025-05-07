import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, user: adminUser } = useAuth(); 
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [userToUpdateRole, setUserToUpdateRole] = useState(null); 
  const [roleConfirmChecked, setRoleConfirmChecked] = useState(false);
  const [isSubmittingRoleChange, setIsSubmittingRoleChange] = useState(false);

  const fetchAllUsers = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found. Admin access required.");
      setLoading(false);
      return;
    }
    console.log("AdminUsersPage: Fetching all users for admin...");
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to fetch users: ${response.status}`);
      }
      console.log("AdminUsersPage: All users fetched successfully:", data.length);
      setUsers(data);
    } catch (err) {
      console.error("AdminUsersPage: Error fetching all users:", err);
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Helper
  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return isoString || e;}
  };

  // Role Update Handler
  const handleRoleUpdateInitiate = (targetUserId, targetUsername, currentIsAdmin) => {
    if (adminUser && adminUser.id === targetUserId) {
        setError("You cannot change your own admin status from this interface.");
        setTimeout(() => setError(null), 4000); // Clear error after a few seconds
        return;
    }
    console.log(`Initiating role update for User ID: ${targetUserId} to isAdmin: ${!currentIsAdmin}`);
    setUserToUpdateRole({ id: targetUserId, username: targetUsername, newIsAdmin: !currentIsAdmin });
    setRoleConfirmChecked(false);
    setShowRoleConfirm(true); 
    setError('');
  };

  // Handler for Confirming Role Update
  const handleConfirmRoleUpdate = async () => {
    if (!userToUpdateRole || !roleConfirmChecked) {
      console.log("Role update confirmation not checked or user not set.");
      return;
    }
    setIsSubmittingRoleChange(true);
    setError('');

    try {
        const response = await fetch(`/api/admin/users/${userToUpdateRole.id}/role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isAdmin: userToUpdateRole.newIsAdmin }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Failed to update user role: ${response.status}`);
        }
        console.log(`User ID: ${userToUpdateRole.id} role updated successfully.`);
        setShowRoleConfirm(false);
        setUserToUpdateRole(null);
        fetchAllUsers();
    } catch (err) {
        console.error(`Error updating role for User ID ${userToUpdateRole.id}:`, err);
        setError(err.message || 'Could not update user role.');
        setShowRoleConfirm(false);
        setUserToUpdateRole(null);
    } finally {
        setIsSubmittingRoleChange(false);
    }
  };

  // Handler for Cancelling Role Update
  const handleCancelRoleUpdate = () => {
    setShowRoleConfirm(false);
    setUserToUpdateRole(null);
  };


  // Styling Classes
  const actionButtonClasses = "px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white disabled:opacity-50 disabled:cursor-not-allowed";
  const confirmButtonClasses = `${actionButtonClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
  const secondaryButtonClasses = "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";
  const checkboxLabelClasses = "ml-2 block text-sm text-gray-900";
  const checkboxClasses = "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500";


  // --- Render Logic ---
  if (loading) {
    return <div className="text-center text-gray-500 py-10">Loading users...</div>;
  }
  if (error && users.length === 0) { 
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-lg mx-auto">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Users</h1>
      {error && <div className="text-center text-red-600 bg-red-100 p-3 rounded-md mb-4">Error: {error}</div>}

      {users.length === 0 ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="shadow-md rounded-lg overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Admin?</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">2FA?</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {user.is_admin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Yes</span>
                    ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {user.is_2fa_enabled ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(user.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {adminUser && adminUser.id !== user.id && (
                        <button
                          onClick={() => handleRoleUpdateInitiate(user.id, user.username, user.is_admin)}
                          className={`px-2 py-1 text-xs font-medium rounded-md ${
                            user.is_admin
                              ? 'bg-yellow-500 hover:bg-600 text-grey-500'
                              : 'bg-green-500 hover:bg-green-600 text-grey-500'
                          }`}
                          title={user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                        >
                          {user.is_admin ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showRoleConfirm && userToUpdateRole && (
         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Role Change</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to {userToUpdateRole.newIsAdmin ? 'grant admin privileges to' : 'revoke admin privileges from'} "{userToUpdateRole.username}" (ID: {userToUpdateRole.id})?
                </p>
                {/* Confirmation Checkbox */}
                <div className="flex items-center mb-4">
                    <input
                        id="role-confirm-checkbox"
                        name="role-confirm-checkbox"
                        type="checkbox"
                        checked={roleConfirmChecked}
                        onChange={(e) => setRoleConfirmChecked(e.target.checked)}
                        className={checkboxClasses}
                    />
                    <label htmlFor="role-confirm-checkbox" className={checkboxLabelClasses}>
                        Yes, I am sure I want to change this user's admin status.
                    </label>
                </div>
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={handleCancelRoleUpdate}
                        disabled={isSubmittingRoleChange}
                        className={secondaryButtonClasses}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmRoleUpdate}
                        disabled={!roleConfirmChecked || isSubmittingRoleChange}
                        className={confirmButtonClasses}
                    >
                        {isSubmittingRoleChange ? 'Updating...' : 'Confirm Change'}
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
