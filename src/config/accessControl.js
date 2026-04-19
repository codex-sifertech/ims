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
    },
    'mr.simonpeter@gmail.com': {
        role: USER_ROLES.ADMIN,
        name: 'Simon Peter'
    },
    'admin@sifertech.com': {
        role: USER_ROLES.ADMIN,
        name: 'IMS Admin'
    }
};

export const validateUserAccess = (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    if (accessList[normalizedEmail]) {
        return {
            email: normalizedEmail,
            ...accessList[normalizedEmail]
        };
    }
    return null;
};
