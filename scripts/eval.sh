#!/bin/bash

# Configuration
SESSION_NAME="model_eval"
WORKDIR="/mnt/storage/metnet/coding_llm"
VENV_PATH="LiveCodeBench/livecodebench/bin/activate" 
MODEL_LOCAL_PATH="/mnt/storage/metnet/coding_llm/coder-final" 
STOP="<|im_end|>"

MODEL_NAME="BigJuicyData/Anni"
RELEASE_VERSION="release_v6"
MAX_TOKENS=32000
TEMPERATURE=0.6
TOP_P=0.95
START_DATE="2025-04-1"
END_DATE="2025-05-31"
N_SAMPLES=1 

TMUX_BIN="/home/metnet/miniconda3/bin/tmux"

# Check if session exists
if "$TMUX_BIN" has-session -t $SESSION_NAME 2>/dev/null; then
  echo "Session '$SESSION_NAME' already exists. Attaching..."
  "$TMUX_BIN" attach -t $SESSION_NAME
  exit 0
fi

echo "Starting new tmux session '$SESSION_NAME'..."

"$TMUX_BIN" new-session -d -s $SESSION_NAME "bash --norc -c '
  cd $WORKDIR || { echo \"Workdir not found\"; exit 1; }
  
  if [ -f \"$VENV_PATH\" ]; then
      source \"$VENV_PATH\"
  else
      echo \"ERROR: Virtual environment not found\"
      read -p \"Press enter to exit...\"
      exit 1
  fi

  echo \"Starting vLLM server..\" &&

  cd LiveCodeBench &&
  
  python -u -m lcb_runner.runner.main \
      --model \"$MODEL_NAME\" \
      --local_model_path \"$MODEL_LOCAL_PATH\" \
      --stop \"$STOP\" \
      --scenario codegeneration \
      --release_version \"$RELEASE_VERSION\" \
      --start_date \"$START_DATE\" \
      --end_date \"$END_DATE\" \
      --max_tokens $MAX_TOKENS \
      --temperature $TEMPERATURE \
      --top_p $TOP_P \
      --n $N_SAMPLES \
      --trust_remote_code \
      --openai_timeout 1200 \
      --evaluate &&

  echo \"Server stopped. Press Ctrl+C to close.\";
  exec bash
'"

echo "LiveCodeBench eval started."
echo "API URL: http://localhost:8000/v1"
echo "Attach with: $TMUX_BIN attach -t $SESSION_NAME"