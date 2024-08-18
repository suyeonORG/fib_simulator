const ip = require('ip');
const process = require('process');

function calculateSubnets(baseIP, baseMask, departments) {
    try {
        departments.sort((a, b) => b.hosts - a.hosts);

        let currentNetwork = baseIP;
        let subnets = [];

        for (let dept of departments) {
            let requiredPrefix = Math.ceil(Math.log2(dept.hosts + 2));
            let subnetMaskLength = 32 - requiredPrefix;
            let subnetMask = ip.fromPrefixLen(subnetMaskLength);
            let subnetInfo = ip.subnet(currentNetwork, subnetMask);

            const numberOfIPs = Math.pow(2, 32 - subnetMaskLength);

            subnets.push({
                department: dept.name,
                subnet: `${subnetInfo.networkAddress}/${subnetMaskLength}`,
                mask: subnetMask,
                numberOfIPs: numberOfIPs,
            });

            currentNetwork = ip.fromLong(ip.toLong(subnetInfo.networkAddress) + numberOfIPs);
        }

        return subnets;
    } catch (error) {
        console.error("Error calculating subnets:", error.message);
        return [];
    }
}

function createFIB(subnets, numRouters, routerIndex = 1) {
    try {
        const fibs = [];
        const numDepartments = subnets.length;

        if (numRouters === 1) {
            let fib = subnets.map((subnet, index) => ({
                destination: subnet.subnet,
                nextHop: `eth${index + 1}`,
                direct: 'yes',
            }));
            fib.push({ destination: '0.0.0.0/0', nextHop: 'ISP', direct: 'no' });
            fibs.push({ router: routerIndex, fib, role: 'internet' });
        } else if (numRouters === 2) {
            let internalFib = subnets.map((subnet, index) => ({
                destination: subnet.subnet,
                nextHop: `eth${index + 1}`,
                direct: 'yes',
            }));
            internalFib.push({ destination: '0.0.0.0/0', nextHop: 'Router2', direct: 'no' });
            fibs.push({ router: routerIndex, fib: internalFib, role: 'internal' });

            let gatewayFib = [
                { destination: subnets[numDepartments - 1].subnet, nextHop: 'eth1', direct: 'yes' },
                { destination: subnets[0].subnet.split('/')[0] + '/21', nextHop: 'Router1', direct: 'no' },
                { destination: '0.0.0.0/0', nextHop: 'ISP', direct: 'no' }
            ];
            fibs.push({ router: routerIndex + 1, fib: gatewayFib, role: 'internet' });
        } else if ((numRouters + 1) % 2 === 0) {
            const internetRouterIndex = routerIndex;
            const internalRouterIndex = routerIndex + 1;
            const internalSubnets = subnets.slice(1);

            let gatewayFib = [
                { destination: subnets[0].subnet, nextHop: `eth1`, direct: 'yes' },
                { destination: '0.0.0.0/0', nextHop: 'ISP', direct: 'no' }
            ];
            fibs.push({ router: internetRouterIndex, fib: gatewayFib, role: 'internet' });

            const internalFibs = createFIB(internalSubnets, numRouters - 1, internalRouterIndex);
            internalFibs[0].fib.push({ destination: '0.0.0.0/0', nextHop: `Router${internetRouterIndex}`, direct: 'no' });
            fibs.push(...internalFibs);
        } else {
            const half = Math.ceil((numRouters - 1) / 2);
            const firstHalfSubnets = subnets.slice(0, half);
            const secondHalfSubnets = subnets.slice(half);

            const internetRouter1Index = routerIndex;
            const internetRouter2Index = routerIndex + 1;
            const internalRouter1Index = routerIndex + 2;
            const internalRouter2Index = routerIndex + half + 1;

            const internetSubnet1 = firstHalfSubnets.shift();
            const internetSubnet2 = secondHalfSubnets.shift();

            let gatewayFib1 = [
                { destination: internetSubnet1.subnet, nextHop: `eth1`, direct: 'yes' },
                { destination: '0.0.0.0/0', nextHop: 'ISP', direct: 'no' }
            ];
            fibs.push({ router: internetRouter1Index, fib: gatewayFib1, role: 'internet' });

            let gatewayFib2 = [
                { destination: internetSubnet2.subnet, nextHop: `eth1`, direct: 'yes' },
                { destination: '0.0.0.0/0', nextHop: 'ISP', direct: 'no' }
            ];
            fibs.push({ router: internetRouter2Index, fib: gatewayFib2, role: 'internet' });

            const internalFibs1 = createFIB(firstHalfSubnets, half - 1, internalRouter1Index);
            internalFibs1[0].fib.push({ destination: '0.0.0.0/0', nextHop: `Router${internetRouter1Index}`, direct: 'no' });

            const internalFibs2 = createFIB(secondHalfSubnets, numRouters - half - 1, internalRouter2Index);
            internalFibs2[0].fib.push({ destination: '0.0.0.0/0', nextHop: `Router${internetRouter2Index}`, direct: 'no' });

            fibs.push(...internalFibs1, ...internalFibs2);
        }

        return fibs;
    } catch (error) {
        console.error("Error creating FIB:", error.message);
        return [];
    }
}

function generateDiagram(subnets, numRouters) {
    try {
        const diagramLines = [];
    
        function drawRouter(index, isInternetRouter = false) {
            let label = `Router ${index}`;
            if (isInternetRouter) {
                label += " (Internet)";
            }
            diagramLines.push(label);
        }

        function drawBranch(depth, isLast) {
            let padding = ' '.repeat(depth * 4);
            let branch = isLast ? '└──' : '├──';
            return padding + branch;
        }

        function drawSubnet(depth, index, isLast) {
            const branch = drawBranch(depth, isLast);
            diagramLines.push(`${branch} Department ${String.fromCharCode(65 + index)} (eth${index + 1})`);
        }

        if (numRouters === 1) {
            drawRouter(1, true);
            subnets.forEach((_, index) => drawSubnet(1, index, index === subnets.length - 1));
        } else if (numRouters === 2) {
            drawRouter(1);
            subnets.slice(0, -1).forEach((_, index) => drawSubnet(1, index, false));
            diagramLines.push(drawBranch(1, true) + "Router 2 (Internet)");
            drawSubnet(2, subnets.length - 1, true);
        } else {
            const isEven = (numRouters + 1) % 2 === 0;
            const numInternetRouters = isEven ? 1 : 2;
            const internalRoutersStartIndex = numInternetRouters + 1;

            if (isEven) {
                drawRouter(1, true);
                drawSubnet(1, 0, false);
                diagramLines.push(drawBranch(1, true) + `Router ${internalRoutersStartIndex} (Internal)`);
                subnets.slice(1).forEach((_, index) => drawSubnet(2, index + 1, index === subnets.length - 2));
            } else {
                drawRouter(1, true);
                drawSubnet(1, 0, true);
                drawRouter(2, true);
                drawSubnet(1, 1, true);
                diagramLines.push(drawBranch(1, true) + `Router ${internalRoutersStartIndex} (Internal)`);
                subnets.slice(2).forEach((_, index) => drawSubnet(2, index + 2, index === subnets.length - 3));
            }
        }

        return diagramLines.join('\n');
    } catch (error) {
        console.error("Error generating diagram:", error.message);
        return "Error generating diagram";
    }
}

function main() {
    try {
        const args = process.argv.slice(2);

        if (args.length < 8 || args[0] !== '-sub' || args[2] !== '-mask' || args[4] !== '-r' || args[6] !== '-n' || args.length !== 8 + parseInt(args[7])) {
            console.error("Usage: node main.js -sub <baseIP> -mask <baseMask> -r <numRouters> -n <numberOfDepartments> <hostsDept1> <hostsDept2> ...");
            return;
        }

        const baseIP = args[1];
        const baseMask = args[3];
        const numRouters = parseInt(args[5]);
        const numDepartments = parseInt(args[7]);

        const departments = [];

        for (let i = 0; i < numDepartments; i++) {
            const name = String.fromCharCode(65 + i); // Generate department name A, B, C, ...
            const hosts = parseInt(args[8 + i]);
            departments.push({ name, hosts });
        }

        const subnets = calculateSubnets(baseIP, baseMask, departments);
        console.log("Subnets Allocation:");
        console.table(subnets);

        const fibs = createFIB(subnets, numRouters);
        fibs.forEach((router) => {
            console.log(`\nFIB for Router ${router.router} (${router.role}):`);
            console.table(router.fib);
        });

        const diagram = generateDiagram(subnets, numRouters);
        console.log("\nNetwork Diagram:");
        console.log(diagram);
    } catch (error) {
        console.error("Error in main execution:", error.message);
    }
}

main();
