"use client";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import nacl from "tweetnacl";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { Input } from "./ui/input";
import { motion } from "framer-motion";
import bs58 from "bs58";
import { ethers } from "ethers";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Grid2X2,
  List,
  Trash,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface Wallet {
  publicKey: string;
  privateKey: string;
  mnemonic: string;
  path: string;
}

const WalletGenerator = () => {
  // The 12 words of the mnemonic phrase, filled with spaces by default
  const [mnemonicWords, setMnemonicWords] = useState<string[]>(
    Array(12).fill(" ")
  );

  // An array of strings, each representing a path type (e.g. Solana or Ethereum)
  // The first element of this array is used to determine the type of the next
  // wallet to generate.
  const [pathTypes, setPathTypes] = useState<string[]>([]);

  // An array of generated wallets, each containing a public key, private key,
  // mnemonic phrase, and path.
  const [wallets, setWallets] = useState<Wallet[]>([]);

  // A boolean indicating whether the mnemonic phrase should be shown.
  // This is used to toggle the visibility of the phrase.
  const [showMnemonic, setShowMnemonic] = useState<boolean>(false);

  // The input field for entering a custom mnemonic phrase.
  const [mnemonicInput, setMnemonicInput] = useState<string>("");

  // An array of booleans, where each element corresponds to the visibility of
  // the private key for a given wallet.
  const [visiblePrivateKeys, setVisiblePrivateKeys] = useState<boolean[]>([]);

  // An array of booleans, where each element corresponds to the visibility of
  // the phrase for a given wallet.
  const [visiblePhrases, setVisiblePhrases] = useState<boolean[]>([]);

  // A boolean indicating whether the wallets should be displayed in a grid or
  // list view.
  const [gridView, setGridView] = useState<boolean>(false);

  // A mapping of path types to their corresponding names.
  const pathTypeNames: { [key: string]: string } = {
    "501": "Solana",
    "60": "Ethereum",
  };

  // Get the name of the path type (e.g. Solana or Ethereum) for the first
  // element of the pathTypes array. If the array is empty, this will be an
  // empty string.
  const pathTypeName = pathTypeNames[pathTypes[0]] || "";

  // Run this effect when the component mounts.
  useEffect(() => {
    // Try to load the stored wallets, mnemonic, and path types from local
    // storage. If all three are present, we can restore the state of the
    // component.
    const storedWallets = localStorage.getItem("wallets");
    const storedMnemonic = localStorage.getItem("mnemonics");
    const storedPathTypes = localStorage.getItem("paths");

    if (storedWallets && storedMnemonic && storedPathTypes) {
      // If all three are present, parse the JSON and set the state variables
      // accordingly.
      setMnemonicWords(JSON.parse(storedMnemonic));
      setWallets(JSON.parse(storedWallets));
      setPathTypes(JSON.parse(storedPathTypes));
      // Initialize the visibility arrays with the correct number of elements.
      setVisiblePrivateKeys(JSON.parse(storedWallets).map(() => false));
      setVisiblePhrases(JSON.parse(storedWallets).map(() => false));
    }
  }, []);

  /**
   * Deletes a wallet at the given index from the state variables, as well as
   * from local storage. This function is called when the user clicks the
   * "Delete" button next to a wallet in the list.
   *
   * @param {number} index The index of the wallet to delete.
   */
  const handleDeleteWallet = (index: number) => {
    // Filter out the wallet at the given index from the state variables.
    const updatedWallets = wallets.filter((_, i) => i !== index);
    const updatedPathTypes = pathTypes.filter((_, i) => i !== index);

    // Update the state variables with the new values.
    setWallets(updatedWallets);
    setPathTypes(updatedPathTypes);

    // Update local storage with the new values. This is so that the next time
    // the user visits the page, the correct state is restored.
    localStorage.setItem("wallets", JSON.stringify(updatedWallets));
    localStorage.setItem("paths", JSON.stringify(updatedPathTypes));

    // Update the visibility arrays by removing the wallet at the given index
    // from the arrays.
    setVisiblePrivateKeys(visiblePrivateKeys.filter((_, i) => i !== index));
    setVisiblePhrases(visiblePhrases.filter((_, i) => i !== index));

    // Show a success toast to let the user know that the wallet was deleted
    // successfully.
    toast.success("Wallet deleted successfully!");
  };

  /**
   * Clears all wallets and related data from local storage and the state
   * variables. This is called when the user clicks the "Clear All" button.
   */
  const handleClearWallets = () => {
    // Remove the stored values from local storage.
    localStorage.removeItem("wallets");
    localStorage.removeItem("mnemonics");
    localStorage.removeItem("paths");

    // Reset the state variables to their initial values.
    setWallets([]);
    setMnemonicWords([]);
    setPathTypes([]);

    // Reset the visibility arrays to be empty.
    setVisiblePrivateKeys([]);
    setVisiblePhrases([]);

    // Show a success toast to let the user know that all wallets were cleared.
    toast.success("All wallets cleared.");
  };

  /**
   * Copies the given string to the user's clipboard.
   * @param {string} content - The string to copy to the clipboard.
   */
  const copyToClipboard = (content: string) => {
    // Use the navigator.clipboard API to write the content to the clipboard.
    // This API is supported in most modern browsers, but if you need to support
    // older browsers, you might need to use a fallback approach.
    navigator.clipboard.writeText(content);

    // Show a success toast to let the user know that the content was copied to
    // the clipboard successfully.
    toast.success("Copied to clipboard!");
  };

  /**
   * Toggles the visibility of the private key at the given index in the
   * `visiblePrivateKeys` array.
   *
   * When the user clicks the "Toggle Visibility" button next to a private
   * key, we want to either show or hide the private key. This function does
   * that by flipping the value of the corresponding element in the
   * `visiblePrivateKeys` array.
   *
   * @param {number} index - The index of the private key to toggle the
   *     visibility of.
   */
  const togglePrivateKeyVisibility = (index: number) => {
    // Create a new array with the same elements as `visiblePrivateKeys`, but
    // with the value at the given `index` flipped.
    const newVisiblePrivateKeys = visiblePrivateKeys.map((visible, i) =>
      // If the current index matches the given index, flip the value.
      i === index ? !visible : visible
    );

    // Set the new array as the new value of `visiblePrivateKeys`.
    setVisiblePrivateKeys(newVisiblePrivateKeys);
  };

  /**
   * Toggles the visibility of the phrase at the given index in the
   * `visiblePhrases` array.
   *
   * When the user clicks the "Toggle Visibility" button next to a phrase,
   * we want to either show or hide the phrase. This function does that by
   * flipping the value of the corresponding element in the
   * `visiblePhrases` array.
   *
   * @param {number} index - The index of the phrase to toggle the
   *     visibility of.
   */
  const togglePhraseVisibility = (index: number) => {
    // Create a new array with the same elements as `visiblePhrases`, but
    // with the value at the given `index` flipped.
    const newVisiblePhrases = visiblePhrases.map((visible, i) =>
      // If the current index matches the given index, flip the value.
      i === index ? !visible : visible
    );

    // Set the new array as the new value of `visiblePhrases`.
    setVisiblePhrases(newVisiblePhrases);
  };

  /**
   * Generates a wallet from a mnemonic phrase, path type, and account index.
   *
   * This function takes three parameters:
   *
   * - `pathType`: A string representing the type of wallet to generate.
   *   Valid values are "501" for Solana and "60" for Ethereum.
   * - `mnemonic`: A string representing the mnemonic phrase to use for
   *   generating the wallet.
   * - `accountIndex`: A number representing the index of the account to
   *   generate.
   *
   * The function first derives a seed from the mnemonic phrase and path using
   * the `derivePath` function from the `ed25519-hd-key` library. It then
   * generates a wallet from the derived seed using the `nacl.sign.keyPair.fromSeed`
   * function for Solana wallets or the `ethers.Wallet` constructor for Ethereum
   * wallets.
   *
   * If the wallet is generated successfully, the function returns an object
   * containing the public key, private key, mnemonic phrase, and path. If there
   * is an error, the function returns null and shows an error message using the
   * `toast.error` function.
   *
   * @param {string} pathType - The type of wallet to generate.
   * @param {string} mnemonic - The mnemonic phrase to use for generating the
   *     wallet.
   * @param {number} accountIndex - The index of the account to generate.
   * @returns {Wallet | null} An object containing the public key, private key,
   *     mnemonic phrase, and path, or null if there is an error.
   */
  const generateWalletFromMnemonic = (
    pathType: string,
    mnemonic: string,
    accountIndex: number
  ): Wallet | null => {
    try {
      // Derive a seed from the mnemonic phrase and path using the `derivePath`
      // function from the `ed25519-hd-key` library.
      const seedBuffer = mnemonicToSeedSync(mnemonic);
      const path = `m/44'/${pathType}'/0'/${accountIndex}'`;
      const { key: derivedSeed } = derivePath(path, seedBuffer.toString("hex"));

      // Generate a wallet from the derived seed. For Solana wallets, we use
      // the `nacl.sign.keyPair.fromSeed` function to generate a keypair from
      // the derived seed. For Ethereum wallets, we use the `ethers.Wallet`
      // constructor to generate a wallet from the derived seed.
      let publicKeyEncoded: string;
      let privateKeyEncoded: string;

      if (pathType === "501") {
        // Solana
        const { secretKey } = nacl.sign.keyPair.fromSeed(derivedSeed);
        const keypair = Keypair.fromSecretKey(secretKey);

        // Encode the private key as a base58 string.
        privateKeyEncoded = bs58.encode(secretKey);

        // Encode the public key as a base58 string.
        publicKeyEncoded = keypair.publicKey.toBase58();
      } else if (pathType === "60") {
        // Ethereum
        const privateKey = Buffer.from(derivedSeed).toString("hex");

        // Encode the private key as a hex string.
        privateKeyEncoded = privateKey;

        // Generate a wallet from the private key using the `ethers.Wallet`
        // constructor.
        const wallet = new ethers.Wallet(privateKey);

        // Encode the public key as a hex string.
        publicKeyEncoded = wallet.address;
      } else {
        // If the path type is not supported, show an error message and return
        // null.
        toast.error("Unsupported path type.");
        return null;
      }

      // Return an object containing the public key, private key, mnemonic phrase,
      // and path.
      return {
        publicKey: publicKeyEncoded,
        privateKey: privateKeyEncoded,
        mnemonic,
        path,
      };
    } catch (error) {
      // If there is an error, show an error message and return null.
      toast.error("Failed to generate wallet. Please try again.");
      return null;
    }
  };

  /**
   * Handles the generation of a new wallet when the user clicks the
   * "Generate Wallet" button.
   *
   * This function does the following:
   * 1. Checks if the user has entered a custom recovery phrase in the input
   *    field. If they have, it validates the phrase using the `validateMnemonic`
   *    function from the `bip39` library. If the phrase is invalid, it shows an
   *    error message and returns.
   * 2. If no custom phrase was entered, it generates a new random phrase using
   *    the `generateMnemonic` function from the `bip39` library.
   * 3. Splits the phrase into an array of words using the `split` method.
   * 4. Calls the `generateWalletFromMnemonic` function with the first path type
   *    in the `pathTypes` array, the generated mnemonic phrase, and the length
   *    of the `wallets` array as arguments. This function generates a new wallet
   *    using the mnemonic phrase and path type, and returns an object containing
   *    the public key, private key, mnemonic phrase, and path.
   * 5. If the wallet was generated successfully, it adds the new wallet to the
   *    `wallets` array, updates the `mnemonics` array with the new phrase, and
   *    updates the `paths` array with the new path type. It also updates the
   *    `visiblePrivateKeys` and `visiblePhrases` arrays to include the new
   *    wallet.
   * 6. Finally, it shows a success toast to let the user know that the wallet
   *    was generated successfully.
   */
  const handleGenerateWallet = () => {
    let mnemonic = mnemonicInput.trim();

    if (mnemonic) {
      // Validate the custom recovery phrase entered by the user.
      if (!validateMnemonic(mnemonic)) {
        // If the phrase is invalid, show an error message and return.
        toast.error("Invalid recovery phrase. Please try again.");
        return;
      }
    } else {
      // If no custom phrase was entered, generate a new random phrase.
      mnemonic = generateMnemonic();
    }

    // Split the phrase into an array of words.
    const words = mnemonic.split(" ");

    // Update the `mnemonicWords` state variable with the new phrase.
    setMnemonicWords(words);

    // Generate a new wallet using the mnemonic phrase and path type.
    const wallet = generateWalletFromMnemonic(
      pathTypes[0],
      mnemonic,
      wallets.length
    );

    if (wallet) {
      // If the wallet was generated successfully, add it to the `wallets` array.
      const updatedWallets = [...wallets, wallet];
      setWallets(updatedWallets);

      // Update the `mnemonics` array with the new phrase.
      localStorage.setItem("mnemonics", JSON.stringify(words));

      // Update the `paths` array with the new path type.
      localStorage.setItem("paths", JSON.stringify(pathTypes));

      // Update the `visiblePrivateKeys` and `visiblePhrases` arrays to include
      // the new wallet.
      setVisiblePrivateKeys([...visiblePrivateKeys, false]);
      setVisiblePhrases([...visiblePhrases, false]);

      // Show a success toast to let the user know that the wallet was generated
      // successfully.
      toast.success("Wallet generated successfully!");
    }
  };

  /**
   * Handles the addition of a new wallet to the list of wallets.
   *
   * This function is called when the user clicks the "Add Wallet" button.
   * It first checks if there is a mnemonic phrase stored in the
   * `mnemonicWords` state variable. If there is no phrase, it shows an
   * error message and returns.
   *
   * If there is a phrase, it generates a new wallet using the
   * `generateWalletFromMnemonic` function and adds it to the `wallets`
   * array. It also updates the `pathTypes` array with the new path type
   * and updates the `visiblePrivateKeys` and `visiblePhrases` arrays to
   * include the new wallet.
   *
   * Finally, it shows a success toast to let the user know that the
   * wallet was generated successfully.
   */
  const handleAddWallet = () => {
    if (!mnemonicWords) {
      toast.error("No mnemonic found. Please generate a wallet first.");
      return;
    }

    // Generate a new wallet using the stored mnemonic phrase and path type.
    const wallet = generateWalletFromMnemonic(
      pathTypes[0],
      mnemonicWords.join(" "),
      wallets.length
    );

    if (wallet) {
      // Update the `wallets` array with the new wallet.
      const updatedWallets = [...wallets, wallet];

      // Update the `pathTypes` array with the new path type.
      const updatedPathType = [pathTypes, pathTypes];

      // Update the `visiblePrivateKeys` and `visiblePhrases` arrays to
      // include the new wallet.
      setVisiblePrivateKeys([...visiblePrivateKeys, false]);
      setVisiblePhrases([...visiblePhrases, false]);

      // Store the updated state in local storage.
      setWallets(updatedWallets);
      localStorage.setItem("wallets", JSON.stringify(updatedWallets));
      localStorage.setItem("pathTypes", JSON.stringify(updatedPathType));

      // Show a success toast to let the user know that the wallet was
      // generated successfully.
      toast.success("Wallet generated successfully!");
    }
  };
  return (
    <div className="flex flex-col gap-4">
      {wallets.length === 0 && (
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
        >
          <div className="flex flex-col gap-4">
            {pathTypes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="flex gap-4 flex-col my-12"
              >
                <div className="flex flex-col gap-2">
                  <h1 className="tracking-tighter text-4xl md:text-5xl font-black">
                    Wallet Gen supports multiple blockchains
                  </h1>
                  <p className="text-primary/80 font-semibold text-lg md:text-xl">
                    Choose a blockchain to get started.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size={"lg"}
                    onClick={() => {
                      setPathTypes(["501"]);
                      toast.success(
                        "Wallet selected. Please generate a wallet to continue."
                      );
                    }}
                  >
                    Solana
                  </Button>
                  <Button
                    size={"lg"}
                    onClick={() => {
                      setPathTypes(["60"]);
                      toast.success(
                        "Wallet selected. Please generate a wallet to continue."
                      );
                    }}
                  >
                    Ethereum
                  </Button>
                </div>
              </motion.div>
            )}
            {pathTypes.length !== 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="flex flex-col gap-4 my-12"
              >
                <div className="flex flex-col gap-2">
                  <h1 className="tracking-tighter text-4xl md:text-5xl font-black">
                    Secret Recovery Phrase
                  </h1>
                  <p className="text-primary/80 font-semibold text-lg md:text-xl">
                    Save these words in a safe place.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    type="password"
                    placeholder="Enter your secret phrase (or leave blank to generate)"
                    onChange={(e) => setMnemonicInput(e.target.value)}
                    value={mnemonicInput}
                  />
                  <Button size={"lg"} onClick={() => handleGenerateWallet()}>
                    {mnemonicInput ? "Add Wallet" : "Generate Wallet"}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Display Secret Phrase */}
      {mnemonicWords && wallets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
          className="group flex flex-col items-center gap-4 cursor-pointer rounded-lg border border-primary/10 p-8"
        >
          <div
            className="flex w-full justify-between items-center"
            onClick={() => setShowMnemonic(!showMnemonic)}
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">
              Your Secret Phrase
            </h2>
            <Button
              onClick={() => setShowMnemonic(!showMnemonic)}
              variant="ghost"
            >
              {showMnemonic ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>

          {showMnemonic && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className="flex flex-col w-full items-center justify-center"
              onClick={() => copyToClipboard(mnemonicWords.join(" "))}
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 justify-center w-full items-center mx-auto my-8"
              >
                {mnemonicWords.map((word, index) => (
                  <p
                    key={index}
                    className="md:text-lg bg-foreground/5 hover:bg-foreground/10 transition-all duration-300 rounded-lg p-4"
                  >
                    {word}
                  </p>
                ))}
              </motion.div>
              <div className="text-sm md:text-base text-primary/50 flex w-full gap-2 items-center group-hover:text-primary/80 transition-all duration-300">
                <Copy className="size-4" /> Click Anywhere To Copy
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Display wallet pairs */}
      {wallets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.3,
            ease: "easeInOut",
          }}
          className="flex flex-col gap-8 mt-6"
        >
          <div className="flex md:flex-row flex-col justify-between w-full gap-4 md:items-center">
            <h2 className="tracking-tighter text-3xl md:text-4xl font-extrabold">
              {pathTypeName} Wallet
            </h2>
            <div className="flex gap-2">
              {wallets.length > 1 && (
                <Button
                  variant={"ghost"}
                  onClick={() => setGridView(!gridView)}
                  className="hidden md:block"
                >
                  {gridView ? <Grid2X2 /> : <List />}
                </Button>
              )}
              <Button onClick={() => handleAddWallet()}>Add Wallet</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="self-end">
                    Clear Wallets
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to delete all wallets?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your wallets and keys from local storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleClearWallets()}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <div
            className={`grid gap-6 grid-cols-1 col-span-1  ${
              gridView ? "md:grid-cols-2 lg:grid-cols-3" : ""
            }`}
          >
            {wallets.map((wallet: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3 + index * 0.1,
                  duration: 0.3,
                  ease: "easeInOut",
                }}
                className="flex flex-col rounded-2xl border border-primary/10"
              >
                <div className="flex justify-between px-8 py-6">
                  <h3 className="font-bold text-2xl md:text-3xl tracking-tighter ">
                    Wallet {index + 1}
                  </h3>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex gap-2 items-center"
                      >
                        <Trash className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to delete all wallets?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your wallets and keys from local storage.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteWallet(index)}
                          className="text-destructive"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="flex flex-col gap-8 px-8 py-4 rounded-2xl bg-secondary/50">
                  <div
                    className="flex flex-col w-full gap-2"
                    onClick={() => copyToClipboard(wallet.publicKey)}
                  >
                    <span className="text-lg md:text-xl font-bold tracking-tighter">
                      Public Key
                    </span>
                    <p className="text-primary/80 font-medium cursor-pointer hover:text-primary transition-all duration-300 truncate">
                      {wallet.publicKey}
                    </p>
                  </div>
                  <div className="flex flex-col w-full gap-2">
                    <span className="text-lg md:text-xl font-bold tracking-tighter">
                      Private Key
                    </span>
                    <div className="flex justify-between w-full items-center gap-2">
                      <p
                        onClick={() => copyToClipboard(wallet.privateKey)}
                        className="text-primary/80 font-medium cursor-pointer hover:text-primary transition-all duration-300 truncate"
                      >
                        {visiblePrivateKeys[index]
                          ? wallet.privateKey
                          : "•".repeat(wallet.mnemonic.length)}
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => togglePrivateKeyVisibility(index)}
                      >
                        {visiblePrivateKeys[index] ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* <div className="flex flex-col w-full gap-2">
                    <span className="text-lg md:text-xl font-bold tracking-tighter">
                      Secret Phrase
                    </span>
                    <div className="flex justify-between w-full items-center gap-2">
                      <p
                        onClick={() => copyToClipboard(wallet.mnemonic)}
                        className="text-primary/80 font-medium cursor-pointer hover:text-primary transition-all duration-300 truncate"
                      >
                        {visiblePhrases[index]
                          ? wallet.mnemonic
                          : "•".repeat(wallet.mnemonic.length)}
                      </p>

                      <Button
                        variant="ghost"
                        onClick={() => togglePhraseVisibility(index)}
                      >
                        {visiblePhrases[index] ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div> */}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WalletGenerator;
