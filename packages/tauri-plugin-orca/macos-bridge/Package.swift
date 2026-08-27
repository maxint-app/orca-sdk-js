// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "OrcaTauriBridge",
    platforms: [
        .macOS(.v12),
    ],
    products: [
        .library(
            name: "OrcaTauriBridge",
            type: .static,
            targets: ["OrcaTauriBridge"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/maxint-app/orca-apple.git", branch: "main"),
    ],
    targets: [
        .target(
            name: "OrcaTauriBridge",
            dependencies: [
                .product(name: "Orca", package: "orca-apple"),
            ]
        ),
    ]
)
