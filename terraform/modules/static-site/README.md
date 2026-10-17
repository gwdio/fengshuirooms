# static-site (Phase 4)

S3 bucket (private, OAC) + CloudFront distribution (price class 100) + ACM cert in us-east-1 + Route 53 records.
Outputs: bucket name, distribution id (for cache invalidation in CI), site URL.
