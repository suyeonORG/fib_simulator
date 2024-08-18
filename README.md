# Network FIB (Forwarding Information Base) Generator

This Node.js utility is designed to generate a Forwarding Information Base (FIB) and a network diagram for a specified number of routers and departments within an organization. The tool calculates subnets based on the number of hosts required by each department and assigns these subnets to routers, creating an FIB that can be used for routing and forwarding purposes.

## Features

- **Subnet Calculation**: Automatically calculates subnets for each department based on the number of hosts required.
- **FIB Generation**: Creates a Forwarding Information Base for each router, detailing the routing paths within the network and to the internet.
- **Network Diagram Generation**: Generates a visual representation of the network structure, including routers and the departments they serve.

## Requirements

- **Node.js**: Ensure you have Node.js installed on your system. You can download and install it from the official [Node.js website](https://nodejs.org/).

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/network-fib-generator.git
   cd network-fib-generator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Usage

This utility is executed via the command line, with arguments specifying the base network configuration and the number of hosts for each department.

### Command-Line Arguments

- `-sub <baseIP>`: The base IP address of the network.
- `-mask <baseMask>`: The base network mask.
- `-r <numRouters>`: The number of routers in the network.
- `-n <numberOfDepartments>`: The number of departments, followed by the number of hosts required for each department.

### Example Command

```bash
node main.js -sub 51.91.152.0 -mask 255.255.248.0 -r 2 -n 4 512 354 208 137
```

This command specifies:
- A base network IP of `51.91.152.0` with a mask of `255.255.248.0`.
- `2` routers in the network.
- `4` departments, with `512`, `354`, `208` and `137` hosts respectively.

### Output

The utility will output the following:

1. **Subnets Allocation**: A table displaying the subnets allocated to each department based on their host requirements.

2. **FIB for Routers**: A table showing the FIB for each router, detailing the routing decisions for traffic to each subnet and to the internet.

3. **Network Diagram**: A visual representation of the network topology, showing how departments are connected to routers.

### Sample Output

```bash
Subnets Allocation:
┌─────────┬────────────┬──────────────────┬─────────────────┬─────────────┐
│ (index) │ department │ subnet           │ mask            │ numberOfIPs │
├─────────┼────────────┼──────────────────┼─────────────────┼─────────────┤
│ 0       │ 'A'        │ '51.91.152.0/22' │ '255.255.252.0' │ 1024        │
│ 1       │ 'B'        │ '51.91.156.0/23' │ '255.255.254.0' │ 512         │
│ 2       │ 'C'        │ '51.91.158.0/24' │ '255.255.255.0' │ 256         │
│ 3       │ 'D'        │ '51.91.159.0/24' │ '255.255.255.0' │ 256         │
└─────────┴────────────┴──────────────────┴─────────────────┴─────────────┘

FIB for Router 1 (internal):
┌─────────┬──────────────────┬───────────┬────────┐
│ (index) │ destination      │ nextHop   │ direct │
├─────────┼──────────────────┼───────────┼────────┤
│ 0       │ '51.91.152.0/22' │ 'eth1'    │ 'yes'  │
│ 1       │ '51.91.156.0/23' │ 'eth2'    │ 'yes'  │
│ 2       │ '51.91.158.0/24' │ 'eth3'    │ 'yes'  │
│ 3       │ '51.91.159.0/24' │ 'eth4'    │ 'yes'  │
│ 4       │ '0.0.0.0/0'      │ 'Router2' │ 'no'   │
└─────────┴──────────────────┴───────────┴────────┘

FIB for Router 2 (internet):
┌─────────┬──────────────────┬───────────┬────────┐
│ (index) │ destination      │ nextHop   │ direct │
├─────────┼──────────────────┼───────────┼────────┤
│ 0       │ '51.91.159.0/24' │ 'eth1'    │ 'yes'  │
│ 1       │ '51.91.152.0/21' │ 'Router1' │ 'no'   │
│ 2       │ '0.0.0.0/0'      │ 'ISP'     │ 'no'   │
└─────────┴──────────────────┴───────────┴────────┘

Network Diagram:
Router 1
    ├── Department A (eth1)
    ├── Department B (eth2)
    ├── Department C (eth3)
    └──Router 2 (Internet)
        └── Department D (eth4)
```

## Error Handling

The utility includes error handling to ensure that subnet calculations and FIB generation are performed correctly. In case an error occurs, a descriptive message will be printed to the console.

## Contribution

Contributions are welcome! Please fork this repository and submit a pull request with your improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
