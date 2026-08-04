content = open('/home/nwasim/projects/ddn-kv-cache/backend/app/api/routes.py').read()
import re
# Find all system_prompt triple-quoted strings and their scenario names
parts = content.split('"system_prompt"')
print(f"Found {len(parts)-1} system_prompts\n")

for i, part in enumerate(parts[1:], 1):
    # extract triple quoted string
    match = re.search(r'"""(.*?)"""', part, re.DOTALL)
    if match:
        prompt = match.group(1).strip()
        chars = len(prompt)
        tokens = chars // 4
        kb = round(chars / 1024, 1)
        print(f"Scenario {i}: {chars} chars | ~{tokens} tokens | ~{kb} KB")
        print(f"  Preview: {prompt[:80].replace(chr(10),' ')}...")
        print()
