require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment variables
const rpcUrl = process.env.RPC;
const contractAddress = process.env.CONTRACT_ADDRESS;
const fileWallet = process.env.FILE_WALLET;
const fileAuditLogs = process.env.FILE_AUDIT_LOGS;
const fileErrorLogs = process.env.FILE_ERROR_LOGS;
const value = "0.25";

// Create a provider
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Define the contract ABI
const abi = [
    "function mint(string _domainName, address _domainHolder, address _referrer)"
];

// Names to be used
const generateUniqueNames = () => {
    // Danh sách ban đầu các tên với độ dài từ 6 đến 8 ký tự
    const baseNames = [
        "Robert", "Samuel", "Thomas", "Harvey", "Jessica", "William", "Michael",
        "Abigail", "Cameron", "Anthony", "Benjamin", "Isabella", "Elizabeth",
        "Jonathan", "Nicholas", "Charles", "Sophia", "Eleanor", "Florence",
        "Matthew", "Vincent", "Harriet", "Gabriel", "Cynthia", "Derrick",
        "Frances", "Madison", "Danielle", "Katherine", "Patrick", "Shannon",
        "Clarice", "Everett", "Marissa", "Russell", "Spencer", "Maxwell",
        "Stephen", "Phillip", "Harrison", "Caroline", "Melissa", "Leonard",
        "Tiffany", "Raymond", "Allison", "Georgia", "Frederic", "Estelle",
        "Gerald", "Meredith", "Timothy", "Deborah", "Hannah", "Jackson",
        "Kenneth", "Leonard", "Danette", "Rudolph", "Brendan", "Margery",
        "Reynard", "Allegra", "Gertrud", "Vernice", "Curtiss", "Martine",
        "Desmond", "Lindsay", "Percy", "Caleb", "Elisabet", "Stanley",
        "Carissa", "Adriene", "Beatrix", "Frankie", "Salvador", "Paige",
        "Audrey", "Matilda", "Joanne", "Francis", "Kristen", "Margret",
        "Dominic", "Hollie", "Rebecca", "Lucinda", "Kendall", "Richter",
        "Trevino", "Rosalie", "Veronic", "Melissa", "Theodore", "Ramirez",
        "Rachael", "Eduardo", "Savanna", "Fernando", "Cedrick", "Bridget",
        "Loraine", "Reginald", "Clifton", "Harriett", "Marguer", "Solomon",
        "Emanuel", "Susanna", "Shelton", "Terence", "Miranda", "Lynette",
        "Verlene", "Deirdre", "Juliann", "Brittni", "Patrice", "Luciano",
        "Emerson", "Natalia", "Graciela", "Rodrick", "Alphons", "Jenifer",
        "Dewayne", "Cathryn", "Gilbert", "Rosalia", "Fletcher", "Charity"
    ];

    // Nhân rộng danh sách để có đủ số lượng tên
    let names = [...baseNames];
    while (names.length < 500) {
        const newName = baseNames[Math.floor(Math.random() * baseNames.length)] + Math.floor(Math.random() * 1000);
        names.push(newName.toLowerCase());
    }

    // Đảm bảo tính duy nhất của các tên
    const uniqueNames = [...new Set(names)].slice(0, 500);

    return uniqueNames;
};

const names = generateUniqueNames();

// Function to read private keys from file
async function loadWalletsFromFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.trim().split('\n');
        const wallets = lines.map(line => {
            const [address, privateKey, seed] = line.split('|');
            return { address, privateKey, seed };
        });
        return wallets;
    } catch (error) {
        console.error("Error reading wallets from file:", error);
        throw error;
    }
}

// Function to load used names and addresses from audit log
function loadUsedNamesAndWallets(auditFilePath) {
    try {
        if (!fs.existsSync(auditFilePath)) return { usedNames: new Set(), usedWallets: new Set() };
        const data = fs.readFileSync(auditFilePath, 'utf8');
        const usedNames = new Set();
        const usedWallets = new Set();
        const lines = data.trim().split('\n');
        lines.forEach(line => {
            const nameMatch = line.match(/Name:\s(\w+),/);
            const walletMatch = line.match(/Wallet:\s(0x[a-fA-F0-9]{40}),/);
            if (nameMatch) usedNames.add(nameMatch[1]);
            if (walletMatch) usedWallets.add(walletMatch[1]);
        });
        return { usedNames, usedWallets };
    } catch (error) {
        console.error("Error reading audit log file:", error);
        return { usedNames: new Set(), usedWallets: new Set() };
    }
}

// Function to log successful transactions
function logSuccess(walletAddress, name) {
    const logFilePath = path.resolve(__dirname, fileAuditLogs);
    const logEntry = `Wallet: ${walletAddress}, Name: ${name}, Timestamp: ${new Date().toISOString()}\n`;

    fs.appendFileSync(logFilePath, logEntry, 'utf8');
}

// Function to log names that cause errors
function logErrorName(name) {
    const errorLogFilePath = path.resolve(__dirname, fileErrorLogs);
    const logEntry = `Name: ${name}, Timestamp: ${new Date().toISOString()}\n`;

    fs.appendFileSync(errorLogFilePath, logEntry, 'utf8');
}

// Function to send transaction
async function sendTransaction(wallet, name) {
    try {
        const contract = new ethers.Contract(contractAddress, abi, wallet);
        const feeData = await provider.getFeeData();

        const estimatedGas = await contract.mint.estimateGas(name, wallet.address, "0x0000000000000000000000000000000000000000", { value: ethers.parseEther(value) });

        const gasLimit = estimatedGas * BigInt(200) / BigInt(100); // estimatedGas * 1.2

        const tx = await contract.mint(name, wallet.address, "0x0000000000000000000000000000000000000000", {
            gasLimit: gasLimit,
            gasPrice: feeData.gasPrice,
            value: ethers.parseEther(value)
        });

        console.log(`Transaction hash for wallet ${wallet.address}:`, tx.hash);
        const receipt = await tx.wait();
        console.log(`Transaction for wallet ${wallet.address} was mined in block:`, receipt.blockNumber);

        // Log success
        logSuccess(wallet.address, name);

    } catch (error) {
        // Check for the specific error "Domain with this name already exists"
        if (error.message.includes('Domain with this name already exists')) {
            console.error(`Domain with the name "${name}" already exists. Skipping...`);
            // Log the error name so we don't use it again
            logErrorName(name);
        } else {
            console.error(`Error sending transaction for wallet ${wallet.address}:`, error);
        }
    }
}

// Function to load error names and prevent reuse
function loadErrorNames(errorLogFilePath) {
    try {
        if (!fs.existsSync(errorLogFilePath)) return new Set();
        const data = fs.readFileSync(errorLogFilePath, 'utf8');
        const errorNames = new Set();
        const lines = data.trim().split('\n');
        lines.forEach(line => {
            const nameMatch = line.match(/Name:\s(\w+),/);
            if (nameMatch) errorNames.add(nameMatch[1]);
        });
        return errorNames;
    } catch (error) {
        console.error("Error reading error log file:", error);
        return new Set(); // Return an empty set if there was an error
    }
}

// Function to manage concurrent transactions
async function sendTransactionsWithLimit(wallets, limit, availableNames, usedWallets) {
    const queue = [];

    for (let i = 0; i < wallets.length; i++) {
        const walletInfo = wallets[i];
        if (usedWallets.has(walletInfo.address)) {
            console.log(`Wallet ${walletInfo.address} has already been used. Skipping...`);
            continue; // Skip wallets that have already been used
        }

        const wallet = new ethers.Wallet(walletInfo.privateKey, provider);

        const name = availableNames.shift(); // Take the first available name and remove it

        if (!name) {
            console.log("No more names available.");
            break;
        }

        const transactionPromise = sendTransaction(wallet, name);
        queue.push(transactionPromise);

        if (queue.length >= limit) {
            await Promise.race(queue).catch(console.error); // Wait for at least one Promise to complete
            queue.splice(queue.findIndex(p => p.isFulfilled()), 1);
        }
    }

    await Promise.all(queue);
}

// Add helper to check Promise status
Promise.prototype.isFulfilled = function () {
    return this.then(() => true, () => false);
};

// Main execution
(async () => {
    const filePath = path.resolve(__dirname, fileWallet); // Path to the wallets.txt file
    const auditFilePath = path.resolve(__dirname, fileAuditLogs); // Path to the audit log file
    const errorLogFilePath = path.resolve(__dirname, fileErrorLogs); // Path to the error log file

    const wallets = await loadWalletsFromFile(filePath);

    // Load used names and wallet addresses from the audit log
    const { usedNames, usedWallets } = loadUsedNamesAndWallets(auditFilePath);

    // Load names that caused errors and skip them
    const errorNames = loadErrorNames(errorLogFilePath);

    // Filter out used and error-causing names
    const availableNames = names.filter(name => !usedNames.has(name) && !errorNames.has(name));

    // Call the function with a maximum of 5 concurrent transactions
    await sendTransactionsWithLimit(wallets, 5, availableNames, usedWallets);
})();