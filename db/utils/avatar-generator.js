/**
 * Avatar Generator Utility
 * Generate DiceBear avatar URLs for users
 * 
 * @module db/utils/avatar-generator
 */

/**
 * Generate DiceBear avatar URL
 * @param {string} name - Name to use as seed
 * @param {string} style - Avatar style (default: 'avataaars')
 * @returns {string} Avatar URL
 */
function generateAvatar(name, style = 'avataaars') {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

/**
 * Generate avatar with specific style
 * @param {string} name - Name to use as seed
 * @param {string} style - One of: avataaars, bottts, identicon, initials, etc.
 * @returns {string} Avatar URL
 */
function generateStyledAvatar(name, style) {
  const validStyles = [
    'avataaars', 'bottts', 'identicon', 'initials', 
    'personas', 'pixel-art', 'thumbs'
  ];
  
  const selectedStyle = validStyles.includes(style) ? style : 'avataaars';
  return generateAvatar(name, selectedStyle);
}

/**
 * Generate random avatar style
 * @param {string} name - Name to use as seed
 * @returns {string} Avatar URL with random style
 */
function generateRandomAvatar(name) {
  const styles = ['avataaars', 'bottts', 'personas', 'pixel-art'];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];
  return generateAvatar(name, randomStyle);
}

module.exports = {
  generateAvatar,
  generateStyledAvatar,
  generateRandomAvatar,
};
