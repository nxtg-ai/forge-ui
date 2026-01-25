# /docs-update

**Agent**: Release Sentinel
**Purpose**: Update documentation based on code changes

---

## Usage
````bash
/docs-update                    # Update all stale docs
/docs-update --critical         # Only critical issues
/docs-update --file <path>      # Specific file
/docs-update --dry-run          # Preview changes
/docs-update --auto-commit      # Auto-commit after update
````

---

## Execution Flow
````
1. Load documentation state from state.json
2. Identify files needing updates
3. For each file:
   a. Check doc mapping for generator
   b. If auto-update enabled:
      - Run generator
      - Apply changes
      - Update state
   c. If manual:
      - Flag for human review
      - Provide suggestions
4. Validate updated docs (links, examples)
5. Update state.json with new timestamps
6. Report results
````

---

## Auto-Update Generators

### API Documentation Generator
````python
def generate_api_docs(source_file: str, doc_file: str):
    """Generate API docs from source code annotations"""
    
    # Parse source file for endpoint decorators
    endpoints = parse_endpoints(source_file)
    
    for endpoint in endpoints:
        # Extract JSDoc/TSDoc annotations
        annotations = extract_annotations(endpoint)
        
        # Generate markdown
        markdown = render_endpoint_template(
            method=endpoint.method,
            path=endpoint.path,
            description=annotations.description,
            params=annotations.params,
            returns=annotations.returns,
            errors=annotations.errors,
            examples=annotations.examples,
        )
        
        # Update doc file
        update_doc_section(doc_file, endpoint.path, markdown)
````

### Component Documentation Generator
````python
def generate_component_docs(source_file: str, doc_file: str):
    """Generate component docs from TypeScript interfaces"""
    
    # Parse TypeScript for interface
    interface = parse_component_interface(source_file)
    
    # Extract props
    props = extract_props(interface)
    
    # Generate props table
    props_table = generate_props_table(props)
    
    # Extract examples from JSDoc
    examples = extract_examples(source_file)
    
    # Generate markdown
    markdown = render_component_template(
        name=interface.name,
        description=interface.description,
        props=props_table,
        examples=examples,
    )
    
    # Update doc file
    write_doc(doc_file, markdown)
````

---

## Output Example
````
📝 Documentation Update

Analyzing changes...

  Auto-updating:
    ✅ docs/api/users.md
       - Added PATCH /users/{id}/avatar section
       - Updated response examples
       
    ✅ docs/components/button.md
       - Updated props table (added 'loading' prop)
       - Added new example
       
  Needs human review:
    📋 docs/architecture/overview.md
       - New service added: AvatarService
       - Suggested sections to add:
         • Service responsibility
         • Integration points
         • Data flow diagram

  Validated:
    ✓ All internal links working
    ✓ All code examples compile
    ✓ No broken external links

  State updated:
    - docs/api/users.md: version 2.2.0
    - docs/components/button.md: version 2.2.0

  Run 'git diff docs/' to review changes
````