USE databasego4nft;
-- Création de la table "COLLECTION"
CREATE TABLE COLLECTION (
    Collection_ID INT AUTO_INCREMENT PRIMARY KEY,
    Collection_name VARCHAR(255) NOT NULL,
    Collection_NumberOfNFT INT,
    Collection_Creator VARCHAR(255) NOT NULL
);
-- Ajout de la colonne "Collection_Symbol" à la table "COLLECTION"
ALTER TABLE COLLECTION
ADD Collection_Symbol VARCHAR(255) NOT NULL;

ALTER TABLE COLLECTION
MODIFY Collection_Creator INT NOT NULL;

ALTER TABLE COLLECTION
ADD Collection_Adress VARCHAR(255) NOT NULL;