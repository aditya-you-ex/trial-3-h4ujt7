# --------------------------------------------------------------------------------------------------
# TaskStream AI - BERT Classifier Module
# Implements a BERT-based text classifier for task intent classification, aiming for high accuracy
# in task extraction from emails, chats, and meeting transcripts. Supports advanced error handling,
# caching of classification results, performance monitoring, and model versioning.
#
# External Imports (with explicit version comments):
import torch  # version ^2.0.0
import torch.nn as nn
import torch.nn.functional as F
import numpy as np  # version ^1.24.0
import os
import hashlib
import time
from typing import Dict, Any, List, Optional

# Hugging Face Transformers for BERT implementation (with explicit version comment):
import transformers  # version ^4.30.0
from transformers import BertModel, BertTokenizer

# Internal Imports (with explicit usage verification):
# "clean_text" function for text preprocessing.
from src.backend.nlp.utils.preprocessing import clean_text
# "Logger" class for logging with error() and info() methods.
from src.backend.shared.utils.logger import Logger

# --------------------------------------------------------------------------------------------------
class BERTClassifier:
    """
    BERT-based text classifier for task intent classification with advanced error handling,
    caching, and monitoring capabilities. This class leverages the Hugging Face Transformers
    library for BERT, PyTorch for model operations, and a custom logger for detailed operational
    logs. The classifier supports single-text classification, batch classification, and
    model persistence (save/load) with versioning. It also maintains a local result cache to
    optimize repeated classification calls and uses an adjustable confidence threshold to
    determine acceptable classification certainty.

    Properties:
        model (transformers.BertModel): The pre-trained BERT model instance.
        tokenizer (transformers.BertTokenizer): The BERT tokenizer instance for input encoding.
        classifier_head (torch.nn.Linear): A linear layer mapping BERT embeddings to classification logits.
        logger (Logger): Custom logger instance for error and info logging.
        label_map (dict): Dictionary mapping output class indices to human-readable labels.
        device (torch.device): The computational device (GPU/CPU) assigned to run all model operations.
        result_cache (dict): In-memory cache for classification results, keyed by text input or batch segment.
        confidence_threshold (float): Global fallback threshold for classification confidence.
        max_sequence_length (int): Maximum token length for BERT input truncation/padding.
        batch_size (int): Batch size for optimized bulk classification calls.
    """

    def __init__(
        self,
        model_path: str,
        label_map: Dict[Any, str],
        use_gpu: bool,
        confidence_threshold: float,
        max_sequence_length: int,
        batch_size: int
    ):
        """
        Initializes the BERT classifier with enhanced validation and configuration options.

        Steps:
            1. Validate the provided model_path and ensure it is a readable location/string.
            2. Attempt loading the pre-trained BERT model and tokenizer; raise errors if loading fails.
            3. Initialize and validate the classification head (final Linear layer).
            4. Set up label_map with basic integrity checks (i.e., ensure it's not empty).
            5. Configure the device based on GPU availability or fallback to CPU.
            6. Initialize a custom logger (Logger class) for error/info messages.
            7. Create an in-memory result cache (self.result_cache) for repeated classification calls.
            8. Set model parameters (confidence threshold, max sequence length, batch size).
            9. Perform a quick test inference to confirm the model is operational.
            10. Initialize performance monitoring placeholders (can be extended with actual metrics).
        """
        # 1. Validate model path
        if not isinstance(model_path, str) or not model_path.strip():
            raise ValueError("Invalid model_path provided. It must be a non-empty string.")

        if not label_map or not isinstance(label_map, dict):
            raise ValueError("label_map must be a non-empty dictionary mapping classes to labels.")

        self.label_map: Dict[Any, str] = label_map

        # 2. Load BERT model and tokenizer from the given model path
        try:
            self.tokenizer: BertTokenizer = BertTokenizer.from_pretrained(model_path)
            self.model: BertModel = BertModel.from_pretrained(model_path)
        except Exception as e:
            raise RuntimeError(f"Failed to load BERT model/tokenizer from {model_path}: {str(e)}") from e

        # 3. Initialize classifier head
        #    We assume the output dimension of BERT 'base' is 768. The number of labels is derived
        #    from the length of label_map. This can be adjusted if label_map references a single label index.
        hidden_size = self.model.config.hidden_size
        num_labels = len(self.label_map)
        self.classifier_head: nn.Linear = nn.Linear(hidden_size, num_labels)

        # 4. Validate label_map
        if num_labels < 1:
            raise ValueError("Label map must contain at least one label for classification.")

        # 5. Configure device
        if use_gpu and torch.cuda.is_available():
            self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        # Move model and classifier head to device
        self.model.to(self.device)
        self.classifier_head.to(self.device)
        self.model.eval()

        # 6. Initialize logger
        self.logger: Logger = Logger({
            "level": "info",
            "consoleEnabled": True,
            "environment": "production"  # can be customized or read from config
        })

        # 7. Initialize result cache (can be extended with TTL or more advanced caching logic)
        self.result_cache: Dict[str, Any] = {}

        # 8. Set model parameters
        self.confidence_threshold = confidence_threshold
        self.max_sequence_length = max_sequence_length
        self.batch_size = batch_size

        # 9. Quick test inference to confirm operational model
        try:
            test_input = "Test inference for BERT classifier initialization."
            _ = self.classify(text=test_input, confidence_threshold=self.confidence_threshold, use_cache=False)
        except Exception as init_err:
            self.logger.error(
                "Initial model test inference failed, the BERT classifier may not be configured correctly.",
                {"error": str(init_err)}
            )
            raise RuntimeError("BERT classifier initialization test failed.") from init_err

        # 10. Initialize performance monitoring placeholders (no-op in this example)
        self.logger.info("BERTClassifier initialized successfully.", {
            "model_path": model_path,
            "use_gpu": use_gpu,
            "confidence_threshold": confidence_threshold,
            "max_sequence_length": max_sequence_length,
            "batch_size": batch_size
        })

    def preprocess(self, text: str, use_cache: bool) -> Dict[str, Any]:
        """
        Preprocesses text input with enhanced validation and optimization.

        Parameters:
            text (str): Raw input text for classification.
            use_cache (bool): Flag indicating whether to cache the preprocessed result.

        Returns:
            dict: A dictionary containing:
                  - "input_ids": torch.Tensor for token indices.
                  - "attention_mask": torch.Tensor for attention mask.
                  - "token_type_ids": torch.Tensor (optional) for segment IDs if used by BERT.
                  - "validation_status": bool indicating if the input passed validation.
                  - "metadata": Additional info (e.g., original text length, truncated length).

        Steps:
            1. Check input validity (e.g., ensure text is a non-empty string).
            2. Apply basic text length validation (raise error if extremely short or spam).
            3. Clean text using the imported `clean_text` utility function.
            4. Truncate text if it exceeds max_sequence_length tokens (the tokenizer can handle this).
            5. Tokenize text with error handling to produce input_ids, attention_mask, token_type_ids.
            6. Convert the tokenized output into optimized tensor format.
            7. (Optional placeholder) Apply tensor quantization if configured.
            8. Move the tensor batch to the appropriate device (GPU or CPU).
            9. Cache the preprocessed result if use_cache is True.
            10. Return the dictionary with relevant preprocessing metadata.
        """
        if not isinstance(text, str):
            self.logger.error("Invalid input to preprocess; text must be a string.")
            raise ValueError("text must be a string for preprocessing.")

        # 1. Check if text is empty
        if not text.strip():
            self.logger.error("Empty text provided to preprocess.")
            raise ValueError("Cannot preprocess an empty string.")

        # 2. Basic text length validation (arbitrary example threshold)
        if len(text) < 3:
            self.logger.error("Text is too short to be meaningful for classification.")
            raise ValueError("Text is too short to be processed by the BERT classifier.")

        # 3. Clean text using the custom clean_text function
        cleaned_text = clean_text(text, {"lowercase": False})

        # 4. The tokenizer will handle truncation/padding automatically if set.
        #    However, we can measure the length to store as metadata.
        tokens = self.tokenizer.tokenize(cleaned_text)
        original_token_count = len(tokens)

        # 5. Encode text with truncation
        encoded_dict = self.tokenizer.encode_plus(
            cleaned_text,
            max_length=self.max_sequence_length,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
            return_token_type_ids=True
        )

        # 6. Convert to dictionary of Tensors
        input_ids = encoded_dict["input_ids"]
        attention_mask = encoded_dict["attention_mask"]
        token_type_ids = encoded_dict["token_type_ids"]

        # 7. (Optional) Placeholder for tensor quantization if needed. Currently no-op.
        #    Example: if we had some advanced quantization, we would do it here.

        # 8. Move to device
        input_ids = input_ids.to(self.device)
        attention_mask = attention_mask.to(self.device)
        token_type_ids = token_type_ids.to(self.device)

        result = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "token_type_ids": token_type_ids,
            "validation_status": True,
            "metadata": {
                "original_text_length": len(text),
                "original_token_count": original_token_count
            }
        }

        # 9. Cache the result
        if use_cache:
            self.result_cache[f"preprocess_{hashlib.md5(text.encode('utf-8')).hexdigest()}"] = result

        # 10. Return the dictionary with relevant data
        return result

    def classify(
        self,
        text: str,
        confidence_threshold: float,
        use_cache: bool
    ) -> Dict[str, Any]:
        """
        Performs classification on a single piece of text with confidence thresholding and optional caching.

        Parameters:
            text (str): The input text to classify.
            confidence_threshold (float): The confidence threshold for classification acceptance.
            use_cache (bool): Whether to use caching to store/retrieve classification results.

        Returns:
            dict: A dictionary containing classification results, including:
                  - "label": The predicted label string (or None if under threshold).
                  - "confidence": The confidence score of the prediction.
                  - "metadata": Additional info about the inference process.

        Steps:
            1. Check if a cached result exists and return it if present (and use_cache is True).
            2. Validate input and parameters (e.g., text type, threshold range).
            3. Preprocess the input text using the preprocess() method.
            4. Perform model inference and pass the final hidden state to the classifier head.
            5. Convert the raw logits to probability distribution using softmax.
            6. Determine the predicted label index and extract the label from label_map.
            7. Compare the maximum probability with the provided confidence threshold.
            8. If the probability is below threshold, label may be set to None or "UNCERTAIN".
            9. Cache the result if it meets threshold or if caching is desired for all outcomes.
            10. Log classification result for monitoring and return the detailed result object.
        """
        cache_key = f"classify_{hashlib.md5(text.encode('utf-8')).hexdigest()}"
        if use_cache and cache_key in self.result_cache:
            cached_result = self.result_cache[cache_key]
            # Return cached classification result
            return cached_result

        # 2. Validate input
        if not isinstance(text, str) or not text.strip():
            self.logger.error("Invalid or empty text supplied to classify.")
            raise ValueError("Text must be a non-empty string for classification.")

        if not (0.0 < confidence_threshold <= 1.0):
            self.logger.error("Invalid confidence threshold supplied to classify.")
            raise ValueError("confidence_threshold must be between 0 and 1.")

        # 3. Preprocess input
        preprocessing_output = self.preprocess(text, use_cache=False)
        if not preprocessing_output["validation_status"]:
            self.logger.error("Preprocessing failed or returned invalid status.")
            raise RuntimeError("Preprocessing returned an invalid status.")

        # 4. Perform model inference
        input_ids = preprocessing_output["input_ids"]
        attention_mask = preprocessing_output["attention_mask"]
        token_type_ids = preprocessing_output["token_type_ids"]

        with torch.no_grad():
            outputs = self.model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                token_type_ids=token_type_ids
            )
            # For BERT, the pooler_output often is used for classification
            # Alternatively, we can take the [CLS] token vector from last_hidden_state
            pooled_output = outputs.pooler_output

            # Pass the pooled_output through the classifier head
            logits = self.classifier_head(pooled_output)

        # 5. Convert logits to probabilities
        probabilities = F.softmax(logits, dim=1).squeeze(0)  # shape: (num_labels,)

        # 6. Determine predicted label
        max_prob_index = int(torch.argmax(probabilities).item())
        max_confidence = float(probabilities[max_prob_index].item())
        predicted_label = self.label_map.get(max_prob_index, "UNKNOWN_LABEL")

        # 7. Apply confidence threshold
        final_label = predicted_label if max_confidence >= confidence_threshold else None

        # 8. If below threshold, final_label is set to None. No extra step needed here.

        # 9. Optionally cache the result
        result = {
            "label": final_label,
            "confidence": max_confidence,
            "metadata": {
                "requested_threshold": confidence_threshold,
                "applied_threshold": confidence_threshold,
                "preprocessing_info": preprocessing_output["metadata"],
                "timestamp": time.time(),
            }
        }

        if use_cache:
            self.result_cache[cache_key] = result

        # 10. Log classification result
        self.logger.info("Classification complete.", {
            "text_preview": text[:50] + ("..." if len(text) > 50 else ""),
            "label": final_label,
            "confidence": max_confidence
        })

        return result

    def batch_classify(
        self,
        texts: List[str],
        confidence_threshold: float,
        use_cache: bool
    ) -> List[Dict[str, Any]]:
        """
        Optimized batch classification with parallel or sequential processing.

        Parameters:
            texts (List[str]): List of input texts to classify.
            confidence_threshold (float): Confidence threshold for classification acceptance.
            use_cache (bool): Whether to use caching to store/retrieve classification results.

        Returns:
            List[dict]: A list of dictionaries containing classification results for each input text.

        Steps:
            1. Validate batch size, ensuring it's not empty and does not exceed an extreme limit.
            2. Check if any results are cached; retrieve them if requested.
            3. Split the texts into manageable batches of size self.batch_size.
            4. For each batch:
               a. Preprocess the texts and form a batch tensor.
               b. Perform a single forward pass through the BERT model.
               c. Pass the pooled outputs through the classifier head.
               d. Convert logits to probabilities and compare with threshold.
            5. Compile the results in the original text order.
            6. Log batch classification metrics.
            7. Return the batch classification results.
        """
        if not isinstance(texts, list) or len(texts) == 0:
            self.logger.error("batch_classify called with an invalid texts list.")
            raise ValueError("texts must be a non-empty list of strings.")

        if not (0.0 < confidence_threshold <= 1.0):
            self.logger.error("Invalid confidence threshold in batch_classify.")
            raise ValueError("confidence_threshold must be between 0 and 1.")

        results: List[Dict[str, Any]] = []
        batch_accumulator = []
        index_accumulator = []

        for idx, text in enumerate(texts):
            # Check cache
            cache_key = f"classify_{hashlib.md5(text.encode('utf-8')).hexdigest()}"
            if use_cache and cache_key in self.result_cache:
                results.append(self.result_cache[cache_key])
                continue

            batch_accumulator.append(text)
            index_accumulator.append(idx)

            # Once we reach the batch size or the end, process
            if len(batch_accumulator) == self.batch_size or idx == (len(texts) - 1):
                # Preprocess all texts in the accumulator
                preprocessed_batch = []
                valid_indices = []
                for b_idx, raw_text in enumerate(batch_accumulator):
                    try:
                        ppm = self.preprocess(raw_text, use_cache=False)
                        preprocessed_batch.append(ppm)
                        valid_indices.append(index_accumulator[b_idx])
                    except Exception as e:
                        # Log error and skip
                        self.logger.error("Preprocessing error in batch_classify.", {
                            "error": str(e),
                            "text_preview": raw_text[:50]
                        })
                        # Put a placeholder result
                        results.insert(index_accumulator[b_idx], {
                            "label": None,
                            "confidence": 0.0,
                            "metadata": {"error": str(e)}
                        })

                # Combine Slices for a single inference if we have valid inputs
                if len(preprocessed_batch) > 0:
                    input_ids_batch = torch.cat([p["input_ids"] for p in preprocessed_batch], dim=0)
                    attention_mask_batch = torch.cat([p["attention_mask"] for p in preprocessed_batch], dim=0)
                    token_type_ids_batch = torch.cat([p["token_type_ids"] for p in preprocessed_batch], dim=0)

                    # Single forward pass
                    with torch.no_grad():
                        outputs = self.model(
                            input_ids=input_ids_batch,
                            attention_mask=attention_mask_batch,
                            token_type_ids=token_type_ids_batch
                        )
                        pooled_batch = outputs.pooler_output
                        logits_batch = self.classifier_head(pooled_batch)
                        probabilities_batch = F.softmax(logits_batch, dim=1)

                    # Generate results
                    for b_idx, row_probs in enumerate(probabilities_batch):
                        row_probs = row_probs.cpu()  # move to CPU for final analysis
                        max_prob_index = int(torch.argmax(row_probs).item())
                        max_confidence = float(row_probs[max_prob_index].item())
                        final_label = self.label_map.get(max_prob_index, "UNKNOWN_LABEL")
                        if max_confidence < confidence_threshold:
                            final_label = None

                        classification_result = {
                            "label": final_label,
                            "confidence": max_confidence,
                            "metadata": {
                                "requested_threshold": confidence_threshold,
                                "applied_threshold": confidence_threshold,
                                "batch_inference": True,
                                "timestamp": time.time()
                            }
                        }
                        # Insert result in the correct original index
                        insertion_index = valid_indices[b_idx]
                        # Expand list if needed (in case of earlier placeholders)
                        while len(results) <= insertion_index:
                            results.append({})
                        results.insert(insertion_index, classification_result)

                        # Cache
                        if use_cache:
                            raw_text_for_cache = batch_accumulator[b_idx]
                            per_text_cache_key = f"classify_{hashlib.md5(raw_text_for_cache.encode('utf-8')).hexdigest()}"
                            self.result_cache[per_text_cache_key] = classification_result

                # Clear accumulators
                batch_accumulator = []
                index_accumulator = []

        # 6. Log batch classification metrics
        self.logger.info("Batch classification completed.", {
            "num_texts": len(texts),
            "batch_size": self.batch_size,
            "confidence_threshold": confidence_threshold,
        })

        # 7. Return results. Some entries might have been inserted earlier, so we ensure the final length matches.
        if len(results) < len(texts):
            # Fill blanks with None for not-processed items (should seldom happen if logic is correct).
            results += [{} for _ in range(len(texts) - len(results))]

        return results

    def save_model(self, save_path: str, include_cache: bool) -> Dict[str, Any]:
        """
        Saves the current BERT model and classifier head with versioning and validation.

        Parameters:
            save_path (str): The directory where model artifacts will be saved.
            include_cache (bool): Whether to include the in-memory cache in the saved artifacts.

        Returns:
            dict: A save operation status containing:
                  - "status": "success" or "failed"
                  - "saved_model_version": A unique version identifier for the saved model
                  - Additional metadata such as file checksums, timestamps, or errors.

        Steps:
            1. Generate a unique model version identifier (e.g., timestamp-based or hash-based).
            2. Create the save directory structure if it does not exist.
            3. Save the BERT model and tokenizer with versioning using transformers' save_pretrained.
            4. Save the classifier head state_dict.
            5. Save the label map and essential configuration parameters.
            6. Generate a model checksum (e.g., md5 or sha256 hash) to validate integrity.
            7. If include_cache, save the result_cache to a file.
            8. Create a manifest file summarizing the artifacts.
            9. Validate saved files (e.g., check existence, read them back if needed).
            10. Return the save operation metadata.
        """
        os.makedirs(save_path, exist_ok=True)
        version_id = f"bert_classifier_{int(time.time())}"
        model_subdir = os.path.join(save_path, version_id)

        try:
            # 2. Create the versioned subdirectory
            os.makedirs(model_subdir, exist_ok=True)

            # 3. Save the BERT model & tokenizer
            self.tokenizer.save_pretrained(model_subdir)
            self.model.save_pretrained(model_subdir)

            # 4. Save the classifier head state
            torch.save(self.classifier_head.state_dict(), os.path.join(model_subdir, "classifier_head.pt"))

            # 5. Save label map and config
            config_data = {
                "label_map": self.label_map,
                "confidence_threshold": self.confidence_threshold,
                "max_sequence_length": self.max_sequence_length,
                "batch_size": self.batch_size
            }
            config_path = os.path.join(model_subdir, "config.pt")
            torch.save(config_data, config_path)

            # 6. Generate a checksum by hashing the saved config file
            with open(config_path, "rb") as cf:
                file_bytes = cf.read()
                file_hash = hashlib.md5(file_bytes).hexdigest()

            # 7. Optionally save cache
            cache_file_path = None
            if include_cache and self.result_cache:
                cache_file_path = os.path.join(model_subdir, "result_cache.pt")
                torch.save(self.result_cache, cache_file_path)

            # 8. Create a manifest
            manifest_data = {
                "model_version": version_id,
                "timestamp": time.time(),
                "checksum": file_hash,
                "include_cache": include_cache and self.result_cache is not None,
            }
            manifest_path = os.path.join(model_subdir, "manifest.pt")
            torch.save(manifest_data, manifest_path)

            # 9. Validate saved files (simple existence check)
            if not os.path.exists(manifest_path):
                raise RuntimeError("Manifest file not found after save operation.")

            # 10. Return metadata
            self.logger.info("Model saved successfully.", {
                "model_version": version_id,
                "checksum": file_hash
            })
            return {
                "status": "success",
                "saved_model_version": version_id,
                "checksum": file_hash,
                "include_cache": include_cache
            }

        except Exception as e:
            self.logger.error("Failed to save the BERT model.", {"error": str(e)})
            return {
                "status": "failed",
                "error": str(e)
            }

    def load_model(self, load_path: str, validate_checksum: bool) -> Dict[str, Any]:
        """
        Loads a previously saved model from the specified directory with validation and fallback.

        Parameters:
            load_path (str): The directory path where the model artifacts are stored.
            validate_checksum (bool): Whether to verify the model's checksum from the manifest file.

        Returns:
            dict: A dictionary containing:
                  - "status": "success" or "failed"
                  - "model_version": The version identifier loaded
                  - Additional metadata such as confirmatory checks.

        Steps:
            1. Validate the directory path and look for a manifest file.
            2. If validate_checksum is True, read the stored checksum and compare it with a newly generated one.
            3. Load the BERT model and tokenizer from the directory (using from_pretrained).
            4. Load the classifier head state_dict and re-initialize self.classifier_head.
            5. Validate label map consistency with the loaded config.
            6. Verify critical configurations (confidence_threshold, max_sequence_length, etc.).
            7. Perform a test inference to ensure the model is operational.
            8. Initialize or clear self.result_cache (if found saved).
            9. Set up performance monitoring for the loaded model if needed.
            10. Return the load operation status and metadata.
        """
        if not os.path.isdir(load_path):
            self.logger.error("Specified load directory does not exist.", {"load_path": load_path})
            return {"status": "failed", "error": "Load path is not a valid directory."}

        manifest_path = os.path.join(load_path, "manifest.pt")
        if not os.path.exists(manifest_path):
            self.logger.error("Manifest file is missing in the load directory.")
            return {"status": "failed", "error": "Manifest file not found in the specified directory."}

        try:
            # 1. Load manifest
            manifest_data = torch.load(manifest_path)
            model_version = manifest_data.get("model_version", "unknown_version")
            stored_checksum = manifest_data.get("checksum", None)

            # 2. Check checksum if requested
            if validate_checksum and stored_checksum:
                config_path = os.path.join(load_path, "config.pt")
                if not os.path.exists(config_path):
                    raise RuntimeError("Config file not found while validating checksum.")
                with open(config_path, "rb") as cf:
                    file_bytes = cf.read()
                    current_hash = hashlib.md5(file_bytes).hexdigest()
                if current_hash != stored_checksum:
                    raise RuntimeError("Checksum mismatch: possible file corruption or tampering.")

            # 3. Load the BERT model & tokenizer
            self.tokenizer = BertTokenizer.from_pretrained(load_path)
            self.model = BertModel.from_pretrained(load_path)

            # 4. Load the classifier head
            classifier_state_path = os.path.join(load_path, "classifier_head.pt")
            if not os.path.exists(classifier_state_path):
                raise RuntimeError("Classifier head state file not found.")
            hidden_size = self.model.config.hidden_size
            num_labels = len(self.label_map) if hasattr(self, "label_map") else 1
            self.classifier_head = nn.Linear(hidden_size, num_labels)
            self.classifier_head.load_state_dict(torch.load(classifier_state_path, map_location="cpu"))

            # 5. Load config and verify label map
            config_data = torch.load(os.path.join(load_path, "config.pt"))
            loaded_label_map = config_data.get("label_map", {})
            if len(loaded_label_map) < 1:
                raise RuntimeError("Loaded config contains an invalid or empty label map.")

            # Overwrite local label_map if needed
            self.label_map = loaded_label_map

            # 6. Verify critical configurations
            self.confidence_threshold = config_data.get("confidence_threshold", 0.5)
            self.max_sequence_length = config_data.get("max_sequence_length", 256)
            self.batch_size = config_data.get("batch_size", 8)

            # Move newly loaded components to device
            self.model.to(self.device)
            self.classifier_head.to(self.device)
            self.model.eval()

            # 7. Perform a quick test inference
            test_input = "Load model test inference."
            _ = self.classify(test_input, self.confidence_threshold, use_cache=False)

            # 8. Load or re-initialize cache if available
            cache_file_path = os.path.join(load_path, "result_cache.pt")
            if manifest_data.get("include_cache") and os.path.exists(cache_file_path):
                self.result_cache = torch.load(cache_file_path)
            else:
                self.result_cache = {}

            # 9. Set up or update performance monitoring placeholders (no-op in this example).
            # 10. Return load success
            self.logger.info("Model loaded successfully.", {
                "model_version": model_version,
                "validate_checksum": validate_checksum
            })
            return {
                "status": "success",
                "model_version": model_version
            }

        except Exception as e:
            self.logger.error("Failed to load the BERT model.", {"error": str(e)})
            return {
                "status": "failed",
                "error": str(e)
            }