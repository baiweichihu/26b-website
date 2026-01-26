/**
 * generate identicon avatar url
 * @param {string} identifier - unique identifier for the user (e.g., user ID or email)
 * @return {string} - URL of the generated identicon avatar
 */
export const generateIdenticonAvatarUrl = (identifier) => {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(identifier)}`;
};
