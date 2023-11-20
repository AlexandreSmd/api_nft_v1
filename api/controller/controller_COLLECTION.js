const db = require('../middleware/connectDB');
const { mintNFTA } = require('./mint-collection');

const createCollection = async (req, res) => {
  const { Collection_NumberOfNFT, Collection_Name, Collection_Symbol, metadataArray, recipientAddresses, Collection_CreatorID, OwnerIdArray } = req.body;


  const { 'x-keypub': keypub, 'x-keyprv': keyprv } = req.headers;
  const [nb] = await db.promise().query('SELECT Creator_C FROM CREATOR WHERE Creator_keypub = ? AND Creator_keyprv = ?', [keypub, keyprv]);
  console.log(nb);

  
// Vérification du crédit du créateur
  if (nb[0].Creator_C < Collection_NumberOfNFT) {
     throw new Error('Le createur n a pas assez de credit');
} else {
  // Le créateur a suffisamment de crédit
  // On diminue le crédit du créateur
  await db.promise().query('UPDATE CREATOR SET Creator_C = Creator_C - ? WHERE Creator_keypub = ? AND Creator_keyprv = ?', [Collection_NumberOfNFT, keypub, keyprv]);
}

  // Utilisez une variable pour suivre l'état de l'opération
  let operationSuccessful = false;

  // Appelez la fonction mintNFT avec les arguments souhaités
  const address = await mintNFTA(Collection_NumberOfNFT, Collection_Name, Collection_Symbol, metadataArray, recipientAddresses);

  try {
    const result = await db.promise().query(
      'INSERT INTO COLLECTION (Collection_Name, Collection_NumberOfNFT, Collection_Creator, Collection_Symbol,  Collection_Adress) VALUES (?, ?, ?, ?, ?)',
      [Collection_Name, Collection_NumberOfNFT, Collection_CreatorID, Collection_Symbol, address]
    );
    
    const collectionID = result[0].insertId;
    
    operationSuccessful = true; // Marquez l'opération de la table COLLECTION comme réussie

    // Si l'opération dans la table COLLECTION a réussi, insérez les NFT dans la table NFT
    for (let i = 0; i < metadataArray.length; i++) {
      const metadata = metadataArray[i];
      const NFT_OwnerID = OwnerIdArray[i];
      
      const result = await db.promise().query(
        'INSERT INTO NFT (NFT_name, NFT_metadata_json, NFT_rightID, NFT_CollectionID, NFT_OwnerID, NFT_CreatorID) VALUES (?, ?, ?, ?, ?, ?)',
        [metadata.name, JSON.stringify(metadata), metadata.rightID, collectionID, NFT_OwnerID, Collection_CreatorID]
      );
      
      const insertId = result[0].insertId;

      await db.promise().query(
        'INSERT INTO NFTRIGHT (NFTRIGHT_IDRIGHT, NFTRIGHT_IDNFT) VALUES (?, ?)',
        [metadata.rightID, insertId]
      );
      
      await db.promise().query(
        'UPDATE BENEFICIARY SET Beneficiary_NFTNumber = Beneficiary_NFTNumber + 1 WHERE Beneficiary_ID = ?',
        [NFT_OwnerID]
      );

      await db.promise().query(
        'INSERT INTO BENEFICIARYRIGHT (BeneficiaryRight_BeneficiaryID, BeneficiaryRight_RightID) VALUES (?, ?)',
        [NFT_OwnerID, metadata.rightID]
      );
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données dans la table COLLECTION :', error);
  }

  if (!operationSuccessful) {
    // Si l'opération dans la table COLLECTION n'a pas réussi, renvoyez une réponse d'erreur
    return res.status(500).json({ error: 'Erreur lors de l\'insertion des données dans la table COLLECTION' });
  }

  // L'opération a réussi, renvoyez une réponse réussie
  return res.status(201).json({ message: 'Collection ajoutée avec succès' });
};



// Méthode GET pour obtenir tous les rights qui existe
const getAllCollection = async (req, res) => {
  try {
    const collection = await db.promise().query('SELECT * FROM COLLECTION');
    res.json(collection);
  } catch (error) {
    console.error('Erreur lors de la récupération des collections :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des données' });
  }
};



// Méthode GET pour obtenir tous les NFTs d'une collection avec vérification d'existence de la collection
const getAllNftByIDCollection = async (req, res) => {
  const id = req.params.id;

  try {
    // Vérifier si la collection existe
    const [collection] = await db.promise().query('SELECT * FROM COLLECTION WHERE Collection_ID = ?', id);

    if (collection.length === 0) {
      // Si la collection n'existe pas, renvoyer une erreur
      res.status(404).json({ error: 'Collection inexistante' });
      return;
    }

    // Si la collection existe, récupérer les NFTs associés
    const NFTs = await db.promise().query('SELECT * FROM NFT WHERE NFT_CollectionID = ?', [id]);
    res.json(NFTs[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération des collections ou des NFTs :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des données' });
  }
};


module.exports = {
  getAllCollection,
  createCollection,
  getAllNftByIDCollection,
};
