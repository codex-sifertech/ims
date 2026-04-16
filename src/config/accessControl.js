export const USER_ROLES = {
    MASTER_ADMIN: 'master_admin',
    ADMIN: 'admin',
    OPERATION_MANAGER: 'operation_manager',
    MEMBER: 'member',
};

// Hardcoded user access list as requested
export const accessList = {
    'sifertech.co@gmail.com': {
        role: USER_ROLES.MASTER_ADMIN,
        name: 'SiferTech Master'
    }
};

export const validateUserAccess = (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    if (accessList[normalizedEmail]) {
        return {
            uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
            email: normalizedEmail,
            ...accessList[normalizedEmail]
        };
    }
    return null;
};
