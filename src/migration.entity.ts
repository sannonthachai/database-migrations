import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class DatabaseMigrations {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    timestamp!: number

    @Column()
    name!: string
}