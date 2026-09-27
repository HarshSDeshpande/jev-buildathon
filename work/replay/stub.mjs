export const registry = [];
export const customPolicies = { add: (p) => registry.push(p) };
export const allow = () => ({ decision: "allow" });
export const deny = (reason) => ({ decision: "deny", reason });
export const instruct = (reason) => ({ decision: "instruct", reason });
