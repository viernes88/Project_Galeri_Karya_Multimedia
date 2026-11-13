const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PhotoNFT", function () {
  let nft, admin, curator, creator, other;
  const URI = "ipfs://bafyMetadataTest1";
  const HASH = ethers.keccak256(ethers.toUtf8Bytes("foto-1"));

  beforeEach(async () => {
    [admin, curator, creator, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhotoNFT");
    nft = await Factory.deploy(admin.address);
    await nft.waitForDeployment();
    await nft.grantRole(await nft.MINTER_ROLE(), curator.address);
  });

  it("admin otomatis punya DEFAULT_ADMIN_ROLE dan MINTER_ROLE", async () => {
    expect(
      await nft.hasRole(await nft.DEFAULT_ADMIN_ROLE(), admin.address),
    ).to.equal(true);
    expect(await nft.hasRole(await nft.MINTER_ROLE(), admin.address)).to.equal(
      true,
    );
  });

  it("kurator dapat mint ke alamat kreator", async () => {
    await expect(nft.connect(curator).mintPhoto(creator.address, URI, HASH))
      .to.emit(nft, "PhotoMinted")
      .withArgs(1, creator.address, curator.address, URI, HASH);

    expect(await nft.ownerOf(1)).to.equal(creator.address);
    expect(await nft.creatorOf(1)).to.equal(creator.address);
    expect(await nft.tokenURI(1)).to.equal(URI);
    expect(await nft.totalSupply()).to.equal(1);
  });

  it("non-kurator tidak boleh mint", async () => {
    await expect(
      nft.connect(other).mintPhoto(creator.address, URI, HASH),
    ).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
    // kreator sendiri pun tidak boleh
    await expect(
      nft.connect(creator).mintPhoto(creator.address, URI, HASH),
    ).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
  });

  it("menolak foto dengan hash yang sama", async () => {
    await nft.connect(curator).mintPhoto(creator.address, URI, HASH);
    await expect(
      nft.connect(curator).mintPhoto(creator.address, "ipfs://lain", HASH),
    ).to.be.revertedWithCustomError(nft, "DuplicatePhoto");
  });

  it("menolak creator zero address dan URI kosong", async () => {
    await expect(
      nft.connect(curator).mintPhoto(ethers.ZeroAddress, URI, HASH),
    ).to.be.revertedWithCustomError(nft, "InvalidCreator");
    await expect(
      nft.connect(curator).mintPhoto(creator.address, "", HASH),
    ).to.be.revertedWithCustomError(nft, "EmptyTokenURI");
  });

  it("creatorOf tetap sama setelah NFT dipindahtangankan", async () => {
    await nft.connect(curator).mintPhoto(creator.address, URI, HASH);
    await nft.connect(creator).transferFrom(creator.address, other.address, 1);

    expect(await nft.ownerOf(1)).to.equal(other.address);
    expect(await nft.creatorOf(1)).to.equal(creator.address);
  });

  it("getPhoto dan tokensOfOwner mengembalikan data yang benar", async () => {
    const h2 = ethers.keccak256(ethers.toUtf8Bytes("foto-2"));
    await nft.connect(curator).mintPhoto(creator.address, URI, HASH);
    await nft
      .connect(curator)
      .mintPhoto(creator.address, "ipfs://bafyMetadataTest2", h2);

    const [c, o, uri] = await nft.getPhoto(2);
    expect(c).to.equal(creator.address);
    expect(o).to.equal(creator.address);
    expect(uri).to.equal("ipfs://bafyMetadataTest2");

    const ids = await nft.tokensOfOwner(creator.address);
    expect(ids.map(Number)).to.deep.equal([1, 2]);
    expect(await nft.tokenByIndex(1)).to.equal(2);
  });

  it("admin dapat mencabut role kurator", async () => {
    await nft.revokeRole(await nft.MINTER_ROLE(), curator.address);
    await expect(
      nft.connect(curator).mintPhoto(creator.address, URI, HASH),
    ).to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount");
  });
});
