// Menyalin ABI (+ alamat kontrak jika ada) ke frontend/src/abi/PhotoNFT.json
const fs = require("fs");
const path = require("path");

function exportAbi(extra = {}) {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "PhotoNFT.sol",
    "PhotoNFT.json",
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifact belum ada. Jalankan `npx hardhat compile` dulu.");
  }
  const { abi } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const outDir = path.join(__dirname, "..", "..", "frontend", "src", "abi");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "PhotoNFT.json");

  // pertahankan alamat lama bila dijalankan tanpa deploy
  let previous = {};
  if (fs.existsSync(outFile))
    previous = JSON.parse(fs.readFileSync(outFile, "utf8"));

  fs.writeFileSync(
    outFile,
    JSON.stringify({ ...previous, ...extra, abi }, null, 2),
  );
  console.log("ABI diekspor ke", outFile);
}

module.exports = { exportAbi };
if (require.main === module) exportAbi();
