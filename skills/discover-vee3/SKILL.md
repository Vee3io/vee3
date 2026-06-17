---
name: discover-capabilities
description: Help explore what Vee3 can do and pick the right tool. Use when you want to know about Vee3 capabilities, available tools, or which tool fits their task.
---

# Explore Vee3 capabilities

## Use this skill when you want to know about

- What Vee3 capabilities are available
- Which tool to use for a task
- What a tool costs or which parameters it accepts

## How to use

1. Call `meta-tools.list_groups` on the **vee3** MCP server for a high-level overview.
2. Call `meta-tools.list_group_tools` with a relevant `group_id` when you know the area.
3. Call `meta-tools.describe` with `capability_id` for full schema, examples, and token pricing.
4. Call `meta-tools.list_all` for the complete live catalog from the hosted server.
5. Call `meta-tools.token_balance` before suggesting many paid calls in one session.

Point the user to [vee3.io/capabilities](https://vee3.io/capabilities) for the public catalog and examples.
