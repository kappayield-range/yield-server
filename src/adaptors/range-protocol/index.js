const utils = require('../utils');
const axios = require('axios');

// Chain Id constants
const CHAIN_ID_ETH = 1;
const CHAIN_ID_POLYGON = 137;
const CHAIN_ID_BSC = 56;
const CHAIN_ID_ARBITRUM = 42161;
const CHAIN_ID_MANTLE = 5000;
const CHAIN_ID_BASE = 8453;

const UNISWAP_FEE = {
    "100": "0.01%",
    "500": "0.05%",
    "1000": "0.1%",
    "3000": "0.3%",
    "10000": "1%",
    "0": ""
}

// List all subgraphs for each AMM
const SUBGRAPHS = {
    uniswap: 
        {
        [CHAIN_ID_ETH]: 'https://api.thegraph.com/subgraphs/name/0xbateman/ethereum-uniswap',
        [CHAIN_ID_ARBITRUM]: 'https://api.thegraph.com/subgraphs/name/0xbateman/arbitrum-uniswap',
        [CHAIN_ID_BASE]: 'https://api.thegraph.com/subgraphs/name/0xbateman/base-uniswap'
        }
    ,
    pancakeswap: {
        [CHAIN_ID_BSC]: 'https://api.thegraph.com/subgraphs/name/0xbateman/range-bsc-pancakeswap',
        [CHAIN_ID_ETH]: 'https://api.thegraph.com/subgraphs/name/0xbateman/mainnet-pancakeswap',
    },
    sushiswap: {
        [CHAIN_ID_ARBITRUM]: 'https://api.thegraph.com/subgraphs/name/0xbateman/arbitrum-sushiswap',
    },
    quickswap: {
        [CHAIN_ID_POLYGON]: 'https://api.thegraph.com/subgraphs/name/0xbateman/polygon-quickswap'
    },
    retro: {
        [CHAIN_ID_POLYGON]: 'https://api.thegraph.com/subgraphs/name/0xbateman/polygon-retro'
    },
    agni: {
        [CHAIN_ID_MANTLE]: 'https://api.goldsky.com/api/public/project_clm9yop8acrue2nrf5ck9fujh/subgraphs/mantle/1.0/gn'
    },
    camelot: {
        [CHAIN_ID_ARBITRUM]: 'https://api.thegraph.com/subgraphs/name/0xbateman/arbitrum-camelot'
    },
    fusionx: {
        [CHAIN_ID_MANTLE]: 'https://api.goldsky.com/api/public/project_clm97huay3j9y2nw04d8nhmrt/subgraphs/fusionX/0.1/gn'
    },
    izumi: {
        [CHAIN_ID_MANTLE]: 'https://api.goldsky.com/api/public/project_clm97huay3j9y2nw04d8nhmrt/subgraphs/mantle-izumi/0.2/gn'
    },
    swapsicle: {
        [CHAIN_ID_MANTLE]: 'https://api.goldsky.com/api/public/project_clm97huay3j9y2nw04d8nhmrt/subgraphs/swapsicle/1.0.0/gn'
    }
}

// Excluded Vaults
const EXCLUDED_VAULTS = {
  [CHAIN_ID_ETH]: [
    '0x3d0D622513191E8CF2ED5A340A9180bbfA2Ca95D'.toLowerCase(),
    '0xF9ab542616A0C8fA94e41c968622C3b2367F5ad1'.toLowerCase(),
  ],
  [CHAIN_ID_POLYGON]: [],
  [CHAIN_ID_BSC]: [
    "0x51eaDC8e4D72cca149e3d9254cC5195357056328".toLowerCase(),
    "0x04f7a8FD669B6e84c3A642f6f48B1200A4B1E1E2".toLowerCase()
  ],
  [CHAIN_ID_ARBITRUM]: [
    '0xABda61ECDbd45a02bFc5fcE2141f76D50D19bFBD'.toLowerCase(),
    '0x7548a71f63a2402413E9647798084E8802C288c2'.toLowerCase(),
    '0x27d435274ac6fB174812bC9eA5c4E902Ed271592'.toLowerCase(),
  ],
  [CHAIN_ID_MANTLE]: [
    '0x46E7d197159e39C8A010887C5805f3bB8DDc7aD6'.toLowerCase(),
    '0x92c2fCCC1E38Fb5bB669A57eA5806E4d893b7D45'.toLowerCase(),
    '0xb7ae5Ff93690d1F4Cd2fDC9F818D4D9DaA73EcC4'.toLowerCase(),
    '0x51FA25E5fb0533Fe7b9f4a22CD3146f0B17E4440'.toLowerCase(),
    '0x7dCCC722fC4E735339e3BA21440dB15B22e0C162'.toLowerCase(),
  ],
  [CHAIN_ID_BASE]: []
};

// Format Chain
const formatChainId = async (id) => {
    if (id === CHAIN_ID_ETH) { return "ethereum" }
    else if (id === CHAIN_ID_POLYGON) { return "polygon" }
    else if (id === CHAIN_ID_BSC) { return "bsc" }
    else if (id === CHAIN_ID_ARBITRUM) { return "arbitrum" }
    else if (id === CHAIN_ID_MANTLE) { return "mantle" }
    else if (id === CHAIN_ID_BASE) { return "base" }
}

const getPool = async (subgraph, vaultId, vaultAmm) => {
    let query = `
                {
                vault(id: "${vaultId}") {
                    id
                    liquidity
                    balance0
                    balance1
                    totalSupply
                    totalFeesEarned0
                    totalFeesEarned1
                    ${vaultAmm === 'izumi' ? "tokenX" : "token0"}
                    ${vaultAmm === 'izumi' ? "tokenY" : "token1"}
                    name
                    tag
                    pool
                }
            }`

    try {
        const pool = await axios.post(subgraph, {
            query: query
        })
        // console.log(pool.data.data.vault);
        return pool.data.data.vault;
    } catch {
        console.log("pool request failed for: " + vaultId);
        return {
            id: "Error in getPool()",
            name: "failed/failed"
        }
    }
}

const getSymbols = async (vault) => {
    const vaultName = vault.name;

    const symbol = utils.formatSymbol(vaultName.split("/")[0].split(" ").at(-1)) + "-" + utils.formatSymbol(vaultName.split("/")[1].split(" ").at(0));

    return symbol;
}

const getAPY = async () => {

    // Query RangeAPY.json
    const allData = await axios.get("https://rangeprotocol-public.s3.ap-southeast-1.amazonaws.com/data/RangeAPY.json");
    const rangeData = allData.data.data;

    const filteredVaults = await rangeData.filter((vault) => {
        if (!EXCLUDED_VAULTS[vault.chain_id].includes(vault.vault.toLowerCase())) {
            return true;
        } else {
            return false;
        }
    })

    const pools = await Promise.all(rangeData.map(async (vault) => {

        // Pool Name
        let selectedPool = await getPool(SUBGRAPHS[vault.amm][vault.chain_id], vault.vault, vault.amm);
        
        // console.log(vault);

        // Chain
        let chainName = await formatChainId(vault.chain_id);

        // Symbol
        let symbol = await getSymbols(selectedPool);

        // Url
        const baseUrl = "https://app.rangeprotocol.com/";
        const poolUrl = baseUrl + "amm/" + vault.amm + "/" + vault.vault;

        return {
            pool: (selectedPool.id + "-" + utils.formatChain(chainName)).toLowerCase(),
            chain: utils.formatChain(chainName),
            project: 'range-protocol',
            symbol: symbol,
            tvlUsd: vault.current_notional,
            apyBase: vault.apr ? vault.apr : 0,
            url: poolUrl,
            underlyingTokens: [selectedPool.token0 ? selectedPool.token0 : selectedPool.tokenX, selectedPool.token0 ? selectedPool.token1 : selectedPool.tokenY],
        }
    }))

    return pools;
}

// TODO: Delete before pushing
// getAPY()

module.exports = {
    timetravel: false,
    apy: getAPY,
    url: "https://app.rangeprotocol.com/",
  };