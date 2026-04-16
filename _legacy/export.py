import sys
import json
import main

data = main.load_all_data()

with open('data.json', 'w') as f:
    json.dump(data, f)
