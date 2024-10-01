const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

const numberWallet = process.env.NUMBER_WALLET || 100; // Số lượng ví muốn tạo
const fileWallet = process.env.FILE_WALLET; // tên file lưu thông tin ví

async function createMultipleWalletsAndSaveToFile(n, filename) {
    for (let i = 0; i < n; i++) {
        // Tạo một ví mới
        const wallet = ethers.Wallet.createRandom();

        // Lấy địa chỉ, privateKey và Seedphrase
        const address = wallet.address;
        const privateKey = wallet.privateKey;
        const seedPhrase = wallet.mnemonic.phrase;

        // Tạo chuỗi với định dạng address|privateKey|Seedphrase
        const walletInfo = `${address}|${privateKey}|${seedPhrase}`;

        // Ghi thông tin vào file
        fs.appendFileSync(filename, walletInfo + '\n', 'utf8');

        console.log(`Đã tạo ví thứ ${i + 1} và lưu vào file ${filename}`);
    }
}

createMultipleWalletsAndSaveToFile(numberWallet, fileWallet);
