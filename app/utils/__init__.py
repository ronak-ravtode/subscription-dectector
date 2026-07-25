def parse_forwarding_address(to_email: str) -> str:
    """Extract user ID prefix from forwarding address.
    
    Input: "abc123def@subguard.app" or "abc123def+tag@subguard.app"
    Output: "abc123def"
    """
    local_part = to_email.split("@")[0]
    if "+" in local_part:
        local_part = local_part.split("+")[0]
    return local_part
