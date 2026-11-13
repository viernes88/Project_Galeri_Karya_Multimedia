// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PhotoNFT
 * @notice NFT ERC-721 untuk Galeri Fotografi Terverifikasi.
 *         Hanya akun ber-role MINTER_ROLE (kurator) yang dapat menerbitkan karya.
 *         NFT langsung dimint ke alamat kreator. Pemilik saat ini dibaca lewat ownerOf().
 */
contract PhotoNFT is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;

    /// @dev tokenId => alamat kreator asli (tidak berubah walau NFT dipindahtangankan)
    mapping(uint256 => address) public creatorOf;

    /// @dev hash file foto => sudah pernah dimint (mencegah foto sama dimint dua kali)
    mapping(bytes32 => bool) public isHashUsed;

    event PhotoMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed minter,
        string tokenURI,
        bytes32 fileHash
    );

    error InvalidCreator();
    error EmptyTokenURI();
    error DuplicatePhoto();

    constructor(address admin) ERC721("Galeri Fotografi Terverifikasi", "GFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Menerbitkan karya sebagai NFT ke alamat kreator.
     * @param creator   alamat dompet kreator (penerima NFT)
     * @param uri       tokenURI, mis. "ipfs://<CID metadata>"
     * @param fileHash  hash (SHA-256/keccak256) file foto asli
     */
    function mintPhoto(
        address creator,
        string calldata uri,
        bytes32 fileHash
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (creator == address(0)) revert InvalidCreator();
        if (bytes(uri).length == 0) revert EmptyTokenURI();
        if (isHashUsed[fileHash]) revert DuplicatePhoto();

        isHashUsed[fileHash] = true;
        tokenId = _nextTokenId++;

        creatorOf[tokenId] = creator;
        _safeMint(creator, tokenId);
        _setTokenURI(tokenId, uri);

        emit PhotoMinted(tokenId, creator, msg.sender, uri, fileHash);
    }

    /// @notice Data ringkas satu karya (memudahkan frontend).
    function getPhoto(uint256 tokenId)
        external
        view
        returns (address creator, address currentOwner, string memory uri)
    {
        currentOwner = ownerOf(tokenId); // revert jika token tidak ada
        creator = creatorOf[tokenId];
        uri = tokenURI(tokenId);
    }

    /// @notice Daftar tokenId milik suatu alamat (untuk halaman "Karya Saya").
    function tokensOfOwner(address account) external view returns (uint256[] memory) {
        uint256 n = balanceOf(account);
        uint256[] memory ids = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            ids[i] = tokenOfOwnerByIndex(account, i);
        }
        return ids;
    }

    // ---------- Override wajib (OpenZeppelin v5) ----------

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
