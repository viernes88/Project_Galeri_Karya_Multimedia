const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { exportAbi } = require("./export-abi");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  console.log(
    `Deploy ke ${network} (chainId ${chainId}) dari ${deployer.address}`,
  );

  const PhotoNFT = await hre.ethers.getContractFactory("PhotoNFT");
  const nft = await PhotoNFT.deploy(deployer.address);
  await nft.waitForDeployment();
  const address = await nft.getAddress();
  console.log("PhotoNFT di:", address);

  // Beri role kurator tambahan (opsional) lewat .env
  const curator = process.env.CURATOR_ADDRESS;
  if (curator && hre.ethers.isAddress(curator)) {
    const tx = await nft.grantRole(await nft.MINTER_ROLE(), curator);
    await tx.wait();
    console.log("MINTER_ROLE diberikan ke kurator:", curator);
  }

  // Simpan catatan deployment
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${network}.json`),
    JSON.stringify(
      { network, chainId, address, deployer: deployer.address },
      null,
      2,
    ),
  );

  // Ekspor ABI + alamat untuk frontend
  exportAbi({ address, chainId });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
