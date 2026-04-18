# PLAN: Character Photo Integration (3x4)

Implementation of optional character photos across the Master and Player interfaces.

## 1. ANALYSIS & STRATEGY
- **Storage**: Character photos will be stored as **Base64 strings** directly within the character object in IndexedDB. This avoids complex file system management and ensures offline portability.
- **Dimensions**: Standard "3x4" aspect ratio (approx. 300x400px recommended for high quality, but CSS-restricted to fit the UI).
- **Locations**:
    1. **Full Sheet**: Large display + upload button.
    2. **Player Header**: Small circular/rounded square avatar.
    3. **Master List**: Optional thumbnail in character cards.

## 2. DATABASE CHANGES
- **Location**: `js/character-manager.js`
- **Change**: Update `createNewCharacter` template to include `photo: ""` (Base64 string).

## 3. UI IMPLEMENTATION (MASTER)
- **Location**: `js/character-ui.js`
- **Tasks**:
    - [ ] Update `renderForm`: Add image upload input (hidden) + "Upload Photo" button.
    - [ ] Update `saveChar`: Read the file/Base64 and save it to the character object.
    - [ ] Update `getCharCardHtml`: If `photo` exists, display it as a thumbnail on the card.

## 4. UI IMPLEMENTATION (PLAYER HEADER)
- **Location**: `Jogadores/js/header-player.js`
- **Tasks**:
    - [ ] Update `.active-char-box`: Add an `<img>` or `<div>` with background-image for the avatar.
    - [ ] Add CSS for the header avatar (rounded, border, size).

## 5. FULL CHARACTER SHEET IMPLEMENTATION
- **Location**: `characters-sheet.html` and `Jogadores/characters-sheet.html`
- **Tasks**:
    - [ ] Add a photo container in the profile section (Top/Left).
    - [ ] Implement photo-handling logic (FileReader API) to swap existing photos.
    - [ ] Ensure the "3x4" aspect ratio is maintained via CSS `object-fit: cover`.

## 6. VERIFICATION
- [ ] Test photo upload in Master drawer.
- [ ] Test photo persistence after page reload.
- [ ] Test photo display in Player header across different pages.
- [ ] Test "Ficha Completa" photo display.

---

**Do you approve this plan?**
- **Y**: Proceed with implementation.
- **N**: Request changes.
