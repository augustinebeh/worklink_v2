#!/usr/bin/env python3
"""
Script to clean summary.md by:
1. Removing all empty lines
2. Removing all lines that begin with "Bash"
"""

import os

def clean_summary_file(input_path, output_path=None):
    """
    Clean the summary.md file by removing empty lines and lines starting with 'Bash'.
    
    Args:
        input_path: Path to the input file
        output_path: Path for the output file (if None, overwrites input)
    """
    if output_path is None:
        output_path = input_path
    
    # Read the file
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    original_count = len(lines)
    
    # Filter lines
    cleaned_lines = []
    empty_removed = 0
    bash_removed = 0
    
    for line in lines:
        # Check if line is empty (only whitespace)
        if line.strip() == '':
            empty_removed += 1
            continue
        
        # Check if line starts with "Bash" (after stripping leading whitespace)
        if line.lstrip().startswith('Bash'):
            bash_removed += 1
            continue
        
        cleaned_lines.append(line)
    
    # Write the cleaned file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(cleaned_lines)
    
    # Print summary
    print(f"Cleaning complete!")
    print(f"Original lines: {original_count}")
    print(f"Empty lines removed: {empty_removed}")
    print(f"Lines starting with 'Bash' removed: {bash_removed}")
    print(f"Final lines: {len(cleaned_lines)}")
    print(f"Output saved to: {output_path}")

if __name__ == "__main__":
    # Define paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "summary.md")
    output_file = os.path.join(script_dir, "summary_cleaned.md")
    
    # Run the cleaning
    clean_summary_file(input_file, output_file)
